

## MailerLite Integration Plan

### Prerequisites
You'll need to provide your **MailerLite API Key** which I'll store as a secret (`MAILERLITE_API_KEY`).

### Phase 1: Create Edge Function

Create a new edge function `supabase/functions/add-to-mailerlite/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriberRequest {
  email: string;
  name?: string;
  groups?: string[]; // Optional group IDs
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Add name fields if provided
    if (name) {
      const nameParts = name.trim().split(" ");
      subscriberData.fields = {
        name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
      };
    }

    // Add to specific groups if provided
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
      // Don't fail the user flow - just log the error
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
    // Silent fail - don't break user experience
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Phase 2: Add Secret
Store the `MAILERLITE_API_KEY` as a secret in the backend.

### Phase 3: Update supabase/config.toml
Add the new function configuration:
```toml
[functions.add-to-mailerlite]
verify_jwt = false
```

### Phase 4: Trigger on User Signup

Update `src/contexts/AuthContext.tsx` to call the edge function when a new user signs up. Add this inside the `onAuthStateChange` handler when `event === "SIGNED_IN"`:

```typescript
// Inside onAuthStateChange callback, after setUser/setSession:
if (event === "SIGNED_IN" && session?.user) {
  // Fire and forget - don't await to avoid blocking auth flow
  supabase.functions.invoke("add-to-mailerlite", {
    body: {
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
    },
  }).catch(err => console.warn("MailerLite sync failed:", err));
}
```

### Optional: Also Trigger on Stripe Purchase

For even better targeting, you could also add subscribers when they make a purchase. Update `supabase/functions/stripe-webhook/index.ts` to call MailerLite when `checkout.session.completed` fires.

### Summary

| Component | Action |
|-----------|--------|
| `supabase/functions/add-to-mailerlite/index.ts` | Create new edge function |
| `supabase/config.toml` | Add function config |
| `MAILERLITE_API_KEY` | Add as secret |
| `src/contexts/AuthContext.tsx` | Add signup trigger |
| `supabase/functions/stripe-webhook/index.ts` (optional) | Add purchase trigger |

### Key Design Decisions
- **Silent failures**: The function returns `success: false` but status 200 so user flows aren't interrupted if MailerLite is down
- **Fire and forget**: The frontend doesn't await the result, so signups remain fast
- **Deduplication**: MailerLite handles duplicate emails automatically (updates existing subscriber)

