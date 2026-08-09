import "server-only";

// Guards for /c/[slug], the only path in Porchlight that writes to the database
// without an authenticated user behind it. Audit F-006.
//
// The damage from junk here is not a breach — public_capture() is a
// security-definer RPC with no table grants, so a flood cannot read anything.
// The damage is to the ledger: every fake capture lands in a cost-per-home
// denominator, there is no bulk delete, and junk addresses go on to feed the
// nurture cron, which puts the sending domain's reputation at risk before the
// first real email has gone out.

export type CaptureIdentity = { kind: "email" | "phone"; value: string };

// Deliberately loose. This is a ten-second form at a fair, not a signup flow:
// it needs to reject "asdf" and "<script>", not adjudicate RFC 5322.
const EMAIL_RE = /^[^\s@<>"']+@[^\s@.<>"']+(\.[^\s@.<>"']+)+$/;

/**
 * Validate and normalize what someone typed into the single field.
 * Returns null when it is not plausibly a way to reach a human.
 *
 * Email is lowercased on the way in. Addresses were previously stored exactly
 * as typed, which is also why the inbound webhook had to match case-insensitively.
 */
export function parseContactField(raw: string): CaptureIdentity | null {
  const value = raw.trim();
  if (!value || value.length > 200) return null;

  if (value.includes("@")) {
    const email = value.toLowerCase();
    return EMAIL_RE.test(email) ? { kind: "email", value: email } : null;
  }

  // Phone: keep what they typed (recruiters recognize their own formatting),
  // but insist it contains a plausible number of digits.
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return { kind: "phone", value };
}

/** Names are optional and never load-bearing; just keep them sane. */
export function parseFirstName(raw: string): string | null {
  const name = raw.trim().slice(0, 100);
  return name || null;
}

// ---------------------------------------------------------------------------
// Best-effort throttle.
//
// This is per-instance and in-memory, so it is genuinely weak on Vercel: a
// determined flood spread across warm lambdas will get through, and a cold
// start forgets everything. It is here because it costs nothing and stops the
// single-source case, which is the one that actually happens.
//
// The durable version needs a table and therefore a migration, which on this
// project means a hand-paste. Tracked as the follow-up to F-006 — do not read
// this module as "rate limiting is done".
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const MAX_KEYS = 5_000;

const hits = new Map<string, number[]>();

export function rateLimited(key: string, now = Date.now()): boolean {
  // Unbounded growth is its own denial of service. If the map gets silly,
  // drop it wholesale rather than paying to sort it.
  if (hits.size > MAX_KEYS) hits.clear();

  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

/**
 * Best available client identifier. Vercel sets x-forwarded-for; the leftmost
 * entry is the client, the rest are proxies. Falls back to the slug so that an
 * unknown caller is still throttled as *something* rather than not at all.
 */
export function clientKey(
  forwardedFor: string | null,
  realIp: string | null,
  fallback: string
): string {
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();
  return ip ? `ip:${ip}` : `slug:${fallback}`;
}
