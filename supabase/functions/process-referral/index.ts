import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REFERRAL_CREDITS = 5;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { referral_code, user_id, user_email } = await req.json();

    if (!referral_code || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing referral_code or user_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing referral code ${referral_code} for user ${user_id}`);

    // Find the referral
    const { data: referral, error: findError } = await supabase
      .from("referrals")
      .select("*")
      .eq("referral_code", referral_code)
      .single();

    if (findError || !referral) {
      console.log("Referral code not found:", referral_code);
      return new Response(
        JSON.stringify({ error: "Invalid referral code" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already used or referrer is trying to use own code
    if (referral.referred_user_id || referral.referrer_id === user_id) {
      return new Response(
        JSON.stringify({ error: "Referral code already used or invalid" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update referral with the referred user (pending until they purchase)
    const { error: updateError } = await supabase
      .from("referrals")
      .update({
        referred_user_id: user_id,
        referred_email: user_email,
        status: "registered",
      })
      .eq("id", referral.id);

    if (updateError) {
      console.error("Error updating referral:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to process referral" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Referral ${referral.id} updated - user registered, awaiting first purchase`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Referral registered - credits will be awarded after first purchase" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in process-referral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
