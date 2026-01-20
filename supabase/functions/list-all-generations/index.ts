import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin user IDs allowed to view all generations
const ADMIN_USER_IDS: string[] = [
  // Add your user ID here after first login
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const isAdmin = ADMIN_USER_IDS.includes(user.id) || 
                   user.email?.endsWith("@studioaicovers.com") ||
                   ADMIN_USER_IDS.length === 0;

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for pagination and filters
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 50, 100);
    const offset = body.offset || 0;
    const search = body.search || "";
    const genre = body.genre || "";

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Build query
    let query = adminClient
      .from("generations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`prompt.ilike.%${search}%,song_title.ilike.%${search}%,artist_name.ilike.%${search}%`);
    }

    if (genre) {
      query = query.eq("genre", genre);
    }

    const { data: generations, error: genError, count } = await query;

    if (genError) {
      console.error("Error fetching generations:", genError);
      throw new Error("Failed to fetch generations");
    }

    // Get unique user IDs and fetch their emails
    const userIds = [...new Set(generations?.map(g => g.user_id) || [])];
    const userEmails: Record<string, string> = {};

    for (const userId of userIds) {
      try {
        const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(userId);
        if (authUser?.email) {
          userEmails[userId] = authUser.email;
        }
      } catch (e) {
        console.error(`Failed to get user ${userId}:`, e);
      }
    }

    // Get stats
    const { count: totalCount } = await adminClient
      .from("generations")
      .select("*", { count: "exact", head: true });

    const { data: uniqueUsers } = await adminClient
      .from("generations")
      .select("user_id")
      .limit(1000);

    const uniqueUserCount = new Set(uniqueUsers?.map(u => u.user_id)).size;

    // Attach emails to generations
    const generationsWithEmails = generations?.map(g => ({
      ...g,
      user_email: userEmails[g.user_id] || "Unknown",
    }));

    return new Response(JSON.stringify({
      generations: generationsWithEmails,
      total: count,
      stats: {
        totalGenerations: totalCount,
        uniqueUsers: uniqueUserCount,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
