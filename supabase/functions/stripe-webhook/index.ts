import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit amounts for each package
const CREDIT_AMOUNTS: Record<string, number> = {
  "100": 100,
  "10": 10,
  "50": 50,
  "150": 150,
};

const REFERRAL_CREDITS = 5;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Function to award referral credits when referred user makes first purchase
async function awardReferralCredits(supabaseClient: any, userId: string) {
  try {
    // Check if this user was referred and credits haven't been awarded yet
    const { data: referral, error: findError } = await supabaseClient
      .from("referrals")
      .select("*")
      .eq("referred_user_id", userId)
      .eq("credits_awarded", false)
      .eq("status", "registered")
      .maybeSingle();

    if (findError || !referral) {
      logStep("No pending referral found for user", { userId });
      return;
    }

    logStep("Found pending referral", { referralId: referral.id, referrerId: referral.referrer_id });

    // Award credits to the referrer
    const { data: existingCredits } = await supabaseClient
      .from("user_credits")
      .select("credits")
      .eq("user_id", referral.referrer_id)
      .maybeSingle();

    if (existingCredits) {
      await supabaseClient
        .from("user_credits")
        .update({ credits: existingCredits.credits + REFERRAL_CREDITS })
        .eq("user_id", referral.referrer_id);
    } else {
      await supabaseClient
        .from("user_credits")
        .insert({ user_id: referral.referrer_id, credits: REFERRAL_CREDITS });
    }

    // Log the referral credit transaction
    await supabaseClient
      .from("credit_transactions")
      .insert({
        user_id: referral.referrer_id,
        amount: REFERRAL_CREDITS,
        type: "referral",
        description: `Referral bonus - friend made first purchase`,
      });

    // Mark referral as converted
    await supabaseClient
      .from("referrals")
      .update({
        credits_awarded: true,
        status: "converted",
        converted_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    logStep("Referral credits awarded", { referrerId: referral.referrer_id, credits: REFERRAL_CREDITS });
  } catch (error) {
    logStep("Error awarding referral credits", { error: error instanceof Error ? error.message : String(error) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Initialize Supabase with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { sessionId: session.id, metadata: session.metadata });

      const userId = session.metadata?.user_id;
      const type = session.metadata?.type;
      const packageId = session.metadata?.packageId;

      if (!userId) {
        logStep("No user_id in session metadata");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (type === "credits" && packageId) {
        const creditsToAdd = CREDIT_AMOUNTS[packageId];
        if (!creditsToAdd) {
          logStep("Invalid package ID", { packageId });
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        logStep("Adding credits", { userId, credits: creditsToAdd });

        // Check if user has a credits record
        const { data: existingCredits, error: fetchError } = await supabaseClient
          .from("user_credits")
          .select("credits")
          .eq("user_id", userId)
          .maybeSingle();

        if (fetchError) {
          logStep("Error fetching credits", { error: fetchError.message });
          throw new Error(`Failed to fetch credits: ${fetchError.message}`);
        }

        if (existingCredits) {
          // Update existing credits
          const { error: updateError } = await supabaseClient
            .from("user_credits")
            .update({ credits: existingCredits.credits + creditsToAdd })
            .eq("user_id", userId);

          if (updateError) {
            logStep("Error updating credits", { error: updateError.message });
            throw new Error(`Failed to update credits: ${updateError.message}`);
          }
          logStep("Credits updated", { newTotal: existingCredits.credits + creditsToAdd });
        } else {
          // Insert new credits record
          const { error: insertError } = await supabaseClient
            .from("user_credits")
            .insert({ user_id: userId, credits: creditsToAdd });

          if (insertError) {
            logStep("Error inserting credits", { error: insertError.message });
            throw new Error(`Failed to insert credits: ${insertError.message}`);
          }
          logStep("Credits record created", { credits: creditsToAdd });
        }

        // Log the transaction
        const { error: txError } = await supabaseClient
          .from("credit_transactions")
          .insert({
            user_id: userId,
            amount: creditsToAdd,
            type: "purchase",
            description: `Purchased ${creditsToAdd} credits`,
            stripe_payment_id: session.payment_intent as string,
          });

        if (txError) {
          logStep("Error logging transaction", { error: txError.message });
        } else {
          logStep("Transaction logged");
        }

        // Award referral credits if this is user's first purchase
        await awardReferralCredits(supabaseClient, userId);
      } else if (type === "subscription") {
        // Handle subscription - give monthly credits for starter tier
        const tier = session.metadata?.tier;
        logStep("Subscription activated", { tier, userId });

        if (tier === "starter") {
          // Starter tier gets 50 credits per month
          const creditsToAdd = 50;

          const { data: existingCredits } = await supabaseClient
            .from("user_credits")
            .select("credits")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingCredits) {
            await supabaseClient
              .from("user_credits")
              .update({ credits: existingCredits.credits + creditsToAdd })
              .eq("user_id", userId);
          } else {
            await supabaseClient
              .from("user_credits")
              .insert({ user_id: userId, credits: creditsToAdd });
          }

          await supabaseClient
            .from("credit_transactions")
            .insert({
              user_id: userId,
              amount: creditsToAdd,
              type: "subscription",
              description: `Starter subscription - ${creditsToAdd} monthly credits`,
              stripe_payment_id: session.subscription as string,
            });

          logStep("Starter credits added", { credits: creditsToAdd });
        }
        // Pro and Studio tiers have unlimited generations, handled by subscription check
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
