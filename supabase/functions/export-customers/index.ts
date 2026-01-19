import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin user IDs allowed to export customer data
const ADMIN_USER_IDS: string[] = [
  // Add your user ID here after first login
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the requesting user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Export requested by user:", user.id, user.email);

    // Check if user is admin (by ID or by email domain for flexibility)
    const isAdmin = ADMIN_USER_IDS.includes(user.id) || 
                   user.email?.endsWith("@studioaicovers.com") ||
                   ADMIN_USER_IDS.length === 0; // Allow if no admins configured yet

    if (!isAdmin) {
      console.error("Non-admin access attempt:", user.email);
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client to fetch all users
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch all users using admin API
    console.log("Fetching all users...");
    const allUsers: Array<{ email: string; created_at: string }> = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error("Error fetching users:", listError);
        throw new Error("Failed to fetch users");
      }

      if (!users || users.length === 0) break;

      for (const u of users) {
        if (u.email) {
          allUsers.push({
            email: u.email,
            created_at: u.created_at,
          });
        }
      }

      if (users.length < perPage) break;
      page++;
    }

    console.log(`Found ${allUsers.length} users with emails`);

    // Generate CSV
    const csvHeader = "Email";
    const csvRows = allUsers.map((u) => u.email);
    const csv = csvHeader + "\n" + csvRows.join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
