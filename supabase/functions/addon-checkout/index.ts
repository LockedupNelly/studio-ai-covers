import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Add-on price IDs
const ADDON_PRICE_IDS: Record<string, string> = {
  "motion-upgrade": "price_1SdKPOFTlHtQpdKRzXubCXsl",
  "spotify-canvas": "price_1SdKPaFTlHtQpdKRpxK6TbnR",
  "apple-music-motion": "price_1SdKR6FTlHtQpdKRbPY4GiHv",
  "song-promo-video": "price_1SdKRNFTlHtQpdKRsbp4Zpqd",
  "motion-promo-ad": "price_1SdKRaFTlHtQpdKR1yPAztNJ",
  "motion-promo-billboard": "price_1SdKRnFTlHtQpdKRbXIstENT",
  "promo-ads-texture": "price_1SdKRzFTlHtQpdKReibcccfV",
  "promo-ads-phone": "price_1SdKSGFTlHtQpdKR694Lnwuh",
  "spotify-banner": "price_1SdKSTFTlHtQpdKRYTlaFFlD",
  "youtube-screen": "price_1SdKSeFTlHtQpdKRfYl2T7DG",
  "tracklist-design": "price_1SdKSrFTlHtQpdKRHs13bHNo",
  "lyric-video": "price_1SdKT2FTlHtQpdKRW3kRWyLE",
};

// Subscription product IDs for discount eligibility
const SUBSCRIPTION_DISCOUNTS: Record<string, number> = {
  "prod_TaUTWhd9yIEw4B": 10, // Starter - 10% off
  "prod_TaUUCtQXelHcBD": 10, // Pro - 10% off
  "prod_TaUUG2rRmV18Nz": 20, // Studio - 20% off
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADDON-CHECKOUT] ${step}${detailsStr}`);
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

    const { items } = await req.json();
    logStep("Request received", { itemCount: items?.length });

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided");
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists and has subscription for discount
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    let discountPercent = 0;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });

      // Check for active subscription to apply discount
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });

      for (const sub of subscriptions.data) {
        const productId = sub.items.data[0]?.price?.product as string;
        if (SUBSCRIPTION_DISCOUNTS[productId]) {
          discountPercent = Math.max(discountPercent, SUBSCRIPTION_DISCOUNTS[productId]);
        }
      }
      logStep("Discount check", { discountPercent });
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    for (const item of items) {
      const priceId = ADDON_PRICE_IDS[item.id];
      if (!priceId) {
        logStep("Unknown addon ID", { id: item.id });
        continue;
      }
      lineItems.push({
        price: priceId,
        quantity: 1,
      });
    }

    if (lineItems.length === 0) {
      throw new Error("No valid items in cart");
    }

    logStep("Line items prepared", { count: lineItems.length });

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create checkout session with optional discount
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success?type=addons`,
      cancel_url: `${origin}/addons`,
      metadata: {
        user_id: user.id,
        type: "addons",
        items: JSON.stringify(items.map((i: any) => i.id)),
      },
    };

    // Apply coupon if subscriber has discount
    if (discountPercent > 0) {
      // Create a one-time coupon for this session
      const coupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: "once",
        name: `Subscriber ${discountPercent}% Off`,
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
      logStep("Discount coupon created", { couponId: coupon.id, percent: discountPercent });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

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
