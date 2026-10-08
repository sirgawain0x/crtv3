import { NextRequest, NextResponse } from "next/server";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { createServiceClient } from "@/lib/sdk/supabase/service";
import { isMailgunConfigured, sendMailgunMessage } from "@/lib/mailgun/send";
import { serverLogger } from "@/lib/utils/logger";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const verification = await checkBotIdDeep();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  let body: { publicationSlug?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const publicationSlug = body.publicationSlug?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!publicationSlug || !email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "publicationSlug and valid email are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();

    const { data: publication, error: pubError } = await supabase
      .from("newsletter_publications")
      .select("id, title, slug")
      .eq("slug", publicationSlug)
      .maybeSingle();

    if (pubError || !publication) {
      return NextResponse.json({ error: "Publication not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { error: upsertError } = await supabase.from("newsletter_subscribers").upsert(
      {
        publication_id: publication.id,
        email,
        status: "subscribed",
        subscribed_at: now,
        unsubscribed_at: null,
      },
      { onConflict: "publication_id,email" }
    );

    if (upsertError) {
      serverLogger.error("newsletter_subscribers upsert:", upsertError);
      return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
    }

    if (isMailgunConfigured()) {
      const site =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
        "https://tv.creativeplatform.xyz";
      await sendMailgunMessage({
        to: email,
        subject: `You're subscribed to ${publication.title}`,
        html: `<p>Thanks for subscribing to <strong>${publication.title}</strong> on Creative Platform.</p><p><a href="${site}/news/${publication.slug}">View latest issues</a></p>`,
        text: `Thanks for subscribing to ${publication.title}. Latest: ${site}/news/${publication.slug}`,
        tags: ["newsletter-subscribe", publication.slug],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    serverLogger.error("newsletter subscribe:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
