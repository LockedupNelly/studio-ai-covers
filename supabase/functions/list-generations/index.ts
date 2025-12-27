import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.log("[LIST-GENERATIONS] Auth failed", userErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log("[LIST-GENERATIONS] Fetching for user", userId);

    const { limit, offset } = await req.json().catch(() => ({ limit: 50, offset: 0 }));

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    // Use the index: idx_generations_user_created (user_id, created_at DESC)
    const { data, error } = await supabase
      .from("generations")
      .select("id, prompt, genre, style, mood, image_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      console.error("[LIST-GENERATIONS] DB error", error.code, error.message);
      return new Response(JSON.stringify({ error: "Failed to load generations", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[LIST-GENERATIONS] Returned", data?.length ?? 0, "items");

    return new Response(JSON.stringify({ generations: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[LIST-GENERATIONS] ERROR", e);
    return new Response(JSON.stringify({ error: "Failed to load generations" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
