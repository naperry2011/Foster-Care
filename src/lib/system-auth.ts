import "server-only";
import { timingSafeEqual } from "node:crypto";

// The two system endpoints are exempt from src/proxy.ts on the grounds that
// they guard themselves, so this comparison is the entire gate.
//
// The previous form was `header !== \`Bearer ${process.env.CRON_SECRET}\``.
// With the variable unset that template renders the literal string
// "Bearer undefined", and anyone sending exactly that header gets in. A
// fail-closed check has to treat a missing secret as a refusal, not as a
// secret whose value happens to be "undefined". Vercel preview deployments do
// not inherit Production environment variables unless explicitly scoped, and a
// preview normally points at the same Supabase project.
export function verifySystemSecret(
  provided: string | null,
  expected: string | undefined
): boolean {
  if (!expected) return false;
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // expected length, so compare lengths first and always run the comparison.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
