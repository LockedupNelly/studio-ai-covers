import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs for credit packages (one-time)
const CREDIT_PRICES = {
  "100": "price_1ShZLYFTlHtQpdKRw3OG5qhf",
  "10": "price_1SdJUPFTlHtQpdKR3VROMY2P",
  "50": "price_1SdJUbFTlHtQpdKRJDQrJSPY",
  "150": "price_1SdJUlFTlHtQpdKRBrIVTSJK",
};

// Price IDs for subscriptions
const SUBSCRIPTION_PRICES = {
  starter: "price_1SdJUvFTlHtQpdKR1afB5KaB",
  pro: "price_1SdJV4FTlHtQpdKROOy0GQGD",
  studio: "price_1SdJVFFTlHtQpdKRfxzR9oXJ",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");
    
    const { type, packageId, tier } = await req.json();
    logStep("Request received", { type, packageId, tier });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    let priceId: string;
    let mode: "payment" | "subscription";

    if (type === "credits") {
      priceId = CREDIT_PRICES[packageId as keyof typeof CREDIT_PRICES];
      mode = "payment";
      logStep("Credit package selected", { packageId, priceId });
    } else if (type === "subscription") {
      priceId = SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES];
      mode = "subscription";
      logStep("Subscription tier selected", { tier, priceId });
    } else {
      throw new Error("Invalid checkout type");
    }

    if (!priceId) {
      throw new Error("Invalid package or tier");
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${origin}/payment-success?type=${type}`,
      cancel_url: `${origin}/payment-canceled`,
      metadata: {
        user_id: user.id,
        type,
        packageId: packageId || "",
        tier: tier || "",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});