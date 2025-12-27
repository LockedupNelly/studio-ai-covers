import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prompt, genre, style, mood, imageUrl } = body ?? {};

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "Missing imageUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertErr } = await supabase.from("generations").insert({
      user_id: userData.user.id,
      prompt: typeof prompt === "string" ? prompt : "",
      genre: typeof genre === "string" ? genre : "",
      style: typeof style === "string" ? style : "",
      mood: typeof mood === "string" ? mood : "",
      image_url: imageUrl,
    });

    if (insertErr) {
      console.error("[SAVE-GENERATION] Insert error", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save generation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[SAVE-GENERATION] ERROR", e);
    return new Response(JSON.stringify({ error: "Failed to save generation" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
