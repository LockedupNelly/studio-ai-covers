import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;
const MAX_TITLE_LENGTH = 200;
const MAX_URL_LENGTH = 2048;

// Sanitize HTML to prevent injection
function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate URL format (including data URLs for base64 images)
function isValidUrl(url: string): boolean {
  // Allow base64 data URLs
  if (url.startsWith("data:image/")) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

interface DesignerEditRequest {
  imageUrl: string;
  feedback: string;
  userName?: string;
  songTitle?: string;
  artistName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and verify the JWT token to get authenticated user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - please sign in" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get authenticated user's email from the token (trusted source)
    const userEmail = user.email;
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "User email not available" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const body = await req.json();
    const { imageUrl, feedback, userName, songTitle, artistName } = body as DesignerEditRequest;

    console.log("Processing designer edit request for authenticated user:", userEmail);

    // Validate required fields
    if (!imageUrl || !feedback) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageUrl or feedback" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate URL format (allow larger size for base64 data URLs)
    const maxUrlLen = imageUrl.startsWith("data:image/") ? 10000000 : MAX_URL_LENGTH;
    if (!isValidUrl(imageUrl) || imageUrl.length > maxUrlLen) {
      return new Response(
        JSON.stringify({ error: "Invalid image URL" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate input lengths
    if (feedback.length > MAX_FEEDBACK_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Feedback must be under ${MAX_FEEDBACK_LENGTH} characters` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (userName && userName.length > MAX_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Name must be under ${MAX_NAME_LENGTH} characters` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (songTitle && songTitle.length > MAX_TITLE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Song title must be under ${MAX_TITLE_LENGTH} characters` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (artistName && artistName.length > MAX_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Artist name must be under ${MAX_NAME_LENGTH} characters` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Sanitize all user inputs for HTML embedding
    const safeFeedback = sanitizeHtml(feedback);
    const safeUserName = userName ? sanitizeHtml(userName) : user.user_metadata?.full_name ? sanitizeHtml(user.user_metadata.full_name) : undefined;
    const safeSongTitle = songTitle ? sanitizeHtml(songTitle) : undefined;
    const safeArtistName = artistName ? sanitizeHtml(artistName) : undefined;
    const safeUserEmail = sanitizeHtml(userEmail);

    // Send notification email to admin/design team
    const adminEmailResponse = await resend.emails.send({
      from: "Cover Art Maker <onboarding@resend.dev>",
      to: ["coverartmaker@gmail.com"],
      subject: `New Designer Edit Request from ${safeUserName || safeUserEmail}`,
      html: `
        <h1>New Designer Edit Request</h1>
        <p><strong>From:</strong> ${safeUserName || 'User'} (${safeUserEmail})</p>
        ${safeSongTitle ? `<p><strong>Song Title:</strong> ${safeSongTitle}</p>` : ''}
        ${safeArtistName ? `<p><strong>Artist Name:</strong> ${safeArtistName}</p>` : ''}
        <p><strong>Edit Instructions:</strong></p>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">${safeFeedback}</p>
        <p><strong>Cover Image URL:</strong></p>
        <p><a href="${imageUrl}">${sanitizeHtml(imageUrl)}</a></p>
        <img src="${imageUrl}" alt="Cover to edit" style="max-width: 400px; border-radius: 8px;" />
        <hr />
        <p style="color: #666; font-size: 12px;">Deliver edited cover within 24 hours to: ${safeUserEmail}</p>
      `,
    });

    console.log("Admin notification email sent:", adminEmailResponse);

    // Send confirmation email to user
    const userEmailResponse = await resend.emails.send({
      from: "Cover Art Maker <onboarding@resend.dev>",
      to: [userEmail],
      subject: "We received your designer edit request!",
      html: `
        <h1>Your Designer Edit Request Has Been Received!</h1>
        <p>Hi ${safeUserName || 'there'}!</p>
        <p>We've received your request for professional edits on your cover art. Our design team is on it!</p>
        
        <h3>What you requested:</h3>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">${safeFeedback}</p>
        
        <h3>Your original cover:</h3>
        <img src="${imageUrl}" alt="Your cover" style="max-width: 300px; border-radius: 8px;" />
        
        <h3>What happens next?</h3>
        <ul>
          <li>Our professional designers will review your request</li>
          <li>You'll receive your edited cover within <strong>24 hours</strong></li>
          <li>The final version will be sent to this email address</li>
        </ul>
        
        <p>Thank you for using Cover Art Maker!</p>
        <p>Best regards,<br>The Cover Art Maker Team</p>
      `,
    });

    console.log("User confirmation email sent:", userEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Designer edit request submitted successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in request-designer-edit function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
