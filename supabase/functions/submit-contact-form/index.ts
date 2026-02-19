import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const ALLOWED_ORIGINS = [
  "https://digsgigs-freelancer-hub.vercel.app",
  "https://digsandgigs.com",
  "https://www.digsandgigs.com",
  "https://digsandgigs.net",
  "https://www.digsandgigs.net",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = (await req.json()) as ContactPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : null;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({
          error: "Name, email, and message are required.",
        }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address." }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase.from("contact_submissions").insert({
      name,
      email,
      subject: subject || null,
      message,
      status: "new",
    });

    if (error) {
      console.error("contact_submissions insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save your message. Please try again." }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Forward to support inbox so you see it in support@digsandgigs.net
    const supportEmail = Deno.env.get("SUPPORT_EMAIL") || "support@digsandgigs.net";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const emailSubject = subject ? `Contact: ${subject}` : "Contact form submission";
      await resend.emails.send({
        from: "Digs and Gigs Contact <noreply@digsandgigs.net>",
        to: [supportEmail],
        reply_to: email,
        subject: emailSubject,
        html: `
          <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
          ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ""}
          <p><strong>Message:</strong></p>
          <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>
        `,
      }).catch((err) => console.error("Forward to support email failed:", err));
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    console.error("submit-contact-form error:", e);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      }
    );
  }
});
