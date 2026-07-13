import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";

// Inbound email webhook (Resend inbound / forwarding service).
// Any human reply pauses the automation and creates a task —
// nobody gets a drip while they're trying to talk to a person.
export async function POST(request: Request) {
  if (
    request.headers.get("x-webhook-secret") !== process.env.INBOUND_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const from: string | undefined =
    payload?.from?.email ?? payload?.from ?? payload?.sender;
  const text: string = payload?.text ?? payload?.body ?? "";
  if (!from) return NextResponse.json({ error: "no sender" }, { status: 400 });

  const admin = createAdminClient();
  const { data: contact } = await admin
    .from("contact")
    .select("id, agency_id, first_name, last_name, phone, email")
    .ilike("email", from.trim())
    .maybeSingle();
  if (!contact) return NextResponse.json({ ok: true, matched: false });

  await admin
    .from("contact")
    .update({ automation_paused_at: new Date().toISOString() })
    .eq("id", contact.id);
  await admin.from("touch").insert({
    agency_id: contact.agency_id,
    contact_id: contact.id,
    direction: "in",
    channel: "email",
    body: text.slice(0, 2000),
  });
  const name =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email;
  await admin.from("task").insert({
    agency_id: contact.agency_id,
    contact_id: contact.id,
    kind: "reply",
    title: `${name} replied — automation paused, they're waiting on a human.`,
  });

  return NextResponse.json({ ok: true, matched: true });
}
