import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/admin";

export type NurtureContact = {
  id: string;
  agency_id: string;
  email: string | null;
  first_name: string | null;
  consent_email: boolean;
  opted_out_at: string | null;
  automation_paused_at: string | null;
};

export type Template = {
  id: string;
  subject: string;
  body: string;
};

// Cached for the life of the process: an agency does not stop being a demo.
const demoCache = new Map<string, boolean>();

async function isDemoAgency(
  admin: ReturnType<typeof createAdminClient>,
  agencyId: string
): Promise<boolean> {
  const cached = demoCache.get(agencyId);
  if (cached !== undefined) return cached;
  const { data } = await admin
    .from("agency")
    .select("is_demo")
    .eq("id", agencyId)
    .maybeSingle();
  // fail closed: if we can't tell, don't send
  const isDemo = data?.is_demo ?? true;
  demoCache.set(agencyId, isDemo);
  return isDemo;
}

// The consent gate lives HERE, not in the callers. Every automated email in
// the system goes through this function; there is no other path to Resend.
// Idempotency: send_log has UNIQUE (contact_id, dedupe_key) — we claim the
// key with an insert before sending, so a double-fired cron sends once.
export async function sendNurtureEmail(
  contact: NurtureContact,
  template: Template,
  dedupeKey: string
): Promise<"sent" | "skipped" | "failed"> {
  const admin = createAdminClient();

  if (
    !contact.email ||
    !contact.consent_email ||
    contact.opted_out_at ||
    contact.automation_paused_at
  ) {
    return "skipped";
  }

  // No provider configured: do nothing at all. Claiming a dedupe key here
  // would permanently mark an email as handled that was never sent.
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return "skipped";
  }

  // Demo agencies never send. The cron runs as service_role across every
  // agency, so without this a seeded demo would blast 200 @porchlight.demo
  // addresses the moment a Resend key exists — and the bounces would wreck
  // the sending domain's reputation before the first real nurture email.
  if (await isDemoAgency(admin, contact.agency_id)) {
    return "skipped";
  }

  // Claim the key BEFORE sending so a double-fired cron sends once. The claim
  // is released again if the send fails, so a transient provider outage
  // retries on the next tick instead of silently dropping the email.
  const { error: claimErr } = await admin.from("send_log").insert({
    agency_id: contact.agency_id,
    contact_id: contact.id,
    template_id: template.id,
    channel: "email",
    dedupe_key: dedupeKey,
    status: "sending",
  });
  if (claimErr) {
    // 23505 unique violation = already sent or in flight; anything else = fail closed
    return "skipped";
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Two different URLs on purpose. The body link goes to the page, which asks
  // before opting anyone out, so a mail scanner following it changes nothing.
  // The header points at the POST-only endpoint, which is what Gmail and
  // Outlook call for their built-in unsubscribe button (RFC 8058).
  const unsubscribeUrl = `${base}/u/${contact.id}`;
  const oneClickUrl = `${base}/api/unsubscribe/${contact.id}`;
  const body = template.body
    .replaceAll("{{first_name}}", contact.first_name ?? "there")
    .replaceAll("{{unsubscribe_url}}", `Unsubscribe anytime: ${unsubscribeUrl}`);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: contact.email,
      subject: template.subject,
      text: body,
      headers: {
        "List-Unsubscribe": `<${oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (error) throw error;
  } catch {
    await admin
      .from("send_log")
      .delete()
      .eq("contact_id", contact.id)
      .eq("dedupe_key", dedupeKey);
    return "failed";
  }

  await admin
    .from("send_log")
    .update({ status: "sent" })
    .eq("contact_id", contact.id)
    .eq("dedupe_key", dedupeKey);

  await admin.from("touch").insert({
    agency_id: contact.agency_id,
    contact_id: contact.id,
    direction: "out",
    channel: "email",
    body: `[auto] ${template.subject}`,
  });
  await admin
    .from("contact")
    .update({ last_nurture_at: new Date().toISOString() })
    .eq("id", contact.id);
  return "sent";
}
