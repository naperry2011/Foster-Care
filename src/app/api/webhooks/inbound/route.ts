import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { verifySystemSecret } from "@/lib/system-auth";

// Inbound email webhook (Resend inbound / forwarding service).
// Any human reply pauses the automation and creates a task —
// nobody gets a drip while they're trying to talk to a person.

/**
 * "Nick Perry <nick@example.com>" -> "nick@example.com", and lowercase it.
 * Providers are inconsistent about whether `from` carries a display name.
 */
function normalizeSender(raw: string): string | null {
  const angled = raw.match(/<([^>]+)>/);
  const addr = (angled ? angled[1] : raw).trim().toLowerCase();
  if (!addr || addr.length > 200 || !addr.includes("@")) return null;
  // PostgREST rewrites `*` to `%` before Postgres sees the pattern, so an
  // escape here would arrive already translated. No real address needs one.
  if (addr.includes("*")) return null;
  return addr;
}

/**
 * `from` is attacker-controlled and this runs on the service-role client, which
 * sees every tenant. Unescaped, `%` and `_` are LIKE wildcards, so a crafted
 * sender could match somebody else's agency's contact and land a reply, a task
 * and an automation pause in the wrong tenant — into append-only tables that
 * have no supported way back out. Underscores are legal in real addresses, so
 * they are escaped rather than rejected. Audit F-007.
 */
function escapeLikePattern(addr: string): string {
  return addr.replace(/([\\%_])/g, "\\$1");
}
export async function POST(request: Request) {
  if (
    !verifySystemSecret(
      request.headers.get("x-webhook-secret"),
      process.env.INBOUND_WEBHOOK_SECRET
    )
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const rawFrom: string | undefined =
    payload?.from?.email ?? payload?.from ?? payload?.sender;
  const text: string = payload?.text ?? payload?.body ?? "";
  if (!rawFrom) return NextResponse.json({ error: "no sender" }, { status: 400 });

  const from = normalizeSender(String(rawFrom));
  if (!from) return NextResponse.json({ ok: true, matched: false });

  const admin = createAdminClient();
  // Two rows, not one: `maybeSingle()` reported "no match" for an ambiguous
  // match, which is the right *write* behaviour but hid the case entirely.
  // Ask for two so a genuine ambiguity can be named in the response.
  const { data: matches } = await admin
    .from("contact")
    .select("id, agency_id, first_name, last_name, phone, email")
    .ilike("email", escapeLikePattern(from))
    .limit(2);

  if (!matches?.length) return NextResponse.json({ ok: true, matched: false });

  // The same address in two agencies is a real situation — a person can talk
  // to more than one agency. Guessing which one they meant would write into
  // an append-only table with no way back. Do nothing and say so.
  if (matches.length > 1) {
    return NextResponse.json({ ok: true, matched: false, ambiguous: true });
  }

  const contact = matches[0];

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

// Follow-up, and the actual fix: carry the tenant in the address we send from,
// so a reply resolves by token instead of by matching a string across every
// agency in the database. That needs a per-contact reply address in send.ts
// and somewhere to store the token, so it is a migration — tracked with F-007
// rather than done here. Until then, matching is exact and ambiguity refuses.
