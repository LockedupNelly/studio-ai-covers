import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriberRequest {
  email: string;
  name?: string;
  groups?: string[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
    if (!MAILERLITE_API_KEY) {
      console.error("MAILERLITE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "MailerLite not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, name, groups }: SubscriberRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscriberData: any = {
      email: email.trim().toLowerCase(),
      status: "active",
    };

    if (name) {
      const nameParts = name.trim().split(" ");
      subscriberData.fields = {
        name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
      };
    }

    if (groups && groups.length > 0) {
      subscriberData.groups = groups;
    }

    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriberData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("MailerLite API error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Subscriber added to MailerLite:", email);
    return new Response(
      JSON.stringify({ success: true, subscriber_id: result.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("MailerLite integration error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
