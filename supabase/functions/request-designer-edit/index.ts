import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DesignerEditRequest {
  imageUrl: string;
  feedback: string;
  userEmail: string;
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
    const { imageUrl, feedback, userEmail, userName, songTitle, artistName }: DesignerEditRequest = await req.json();

    console.log("Processing designer edit request for:", userEmail);

    if (!imageUrl || !feedback || !userEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageUrl, feedback, or userEmail" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send notification email to admin/design team
    const adminEmailResponse = await resend.emails.send({
      from: "Cover Art Maker <onboarding@resend.dev>",
      to: ["support@coverartmaker.com"], // Replace with actual design team email
      subject: `New Designer Edit Request from ${userName || userEmail}`,
      html: `
        <h1>New Designer Edit Request</h1>
        <p><strong>From:</strong> ${userName || 'User'} (${userEmail})</p>
        ${songTitle ? `<p><strong>Song Title:</strong> ${songTitle}</p>` : ''}
        ${artistName ? `<p><strong>Artist Name:</strong> ${artistName}</p>` : ''}
        <p><strong>Edit Instructions:</strong></p>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">${feedback}</p>
        <p><strong>Cover Image URL:</strong></p>
        <p><a href="${imageUrl}">${imageUrl}</a></p>
        <img src="${imageUrl}" alt="Cover to edit" style="max-width: 400px; border-radius: 8px;" />
        <hr />
        <p style="color: #666; font-size: 12px;">Deliver edited cover within 24 hours to: ${userEmail}</p>
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
        <p>Hi ${userName || 'there'}!</p>
        <p>We've received your request for professional edits on your cover art. Our design team is on it!</p>
        
        <h3>What you requested:</h3>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">${feedback}</p>
        
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
