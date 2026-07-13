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

  const { error: claimErr } = await admin.from("send_log").insert({
    agency_id: contact.agency_id,
    contact_id: contact.id,
    template_id: template.id,
    channel: "email",
    dedupe_key: dedupeKey,
    status: "sent",
  });
  if (claimErr) {
    // 23505 unique violation = already sent; anything else = fail closed
    return "skipped";
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const unsubscribeUrl = `${base}/u/${contact.id}`;
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
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
      },
    });
    if (error) throw error;
  } catch {
    await admin
      .from("send_log")
      .update({ status: "failed" })
      .eq("contact_id", contact.id)
      .eq("dedupe_key", dedupeKey);
    return "failed";
  }

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
