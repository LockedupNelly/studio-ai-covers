import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

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

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use ANON key + forward the user's JWT to rely on RLS.
    // This avoids service-role usage and keeps memory/overhead low.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
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

    const { data, error } = await supabase
      .from("generations")
      .select("id, prompt, genre, style, mood, image_url, created_at, song_title, artist_name, cover_analysis, parent_id, version, edit_instructions")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      console.error("[LIST-GENERATIONS] DB error", error.code, error.message);
      return new Response(
        JSON.stringify({ error: "Failed to load generations", details: error.message, code: error.code }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[LIST-GENERATIONS] Returned", data?.length ?? 0, "items");

    return new Response(JSON.stringify({ generations: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[LIST-GENERATIONS] ERROR", msg);
    return new Response(JSON.stringify({ error: "Failed to load generations", details: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

