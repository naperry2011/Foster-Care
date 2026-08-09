// Who a nurture email appears to come from.
//
// A family who met The Greenhouse at a church table should not receive mail
// from "Porchlight", a name they have never heard — that reads as spam, and
// the send is already fighting a cold domain's reputation.
//
// Deliberately not in send.ts: that module is `server-only`, and this is pure
// string formatting with no secrets and no I/O, so keeping it separate is what
// makes it directly testable.

// Only the display name is substituted. The address stays exactly as
// configured, because it is the one verified against the Resend sending domain
// and any other value is rejected outright.
export function fromHeaderFor(
  agencyName: string | null,
  emailFrom: string
): string {
  const match = emailFrom.match(/<([^>]+)>\s*$/);
  const address = (match ? match[1] : emailFrom).trim();
  const name = agencyName?.trim();
  if (!name) return emailFrom;
  // RFC 5322: a display name containing specials has to be a quoted-string,
  // and "Greenhouse, Inc." is an ordinary agency name that contains two.
  const display = /[(),.:;<>@[\]"\\]/.test(name)
    ? `"${name.replace(/(["\\])/g, "\\$1")}"`
    : name;
  return `${display} <${address}>`;
}
