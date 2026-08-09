// Is the send path actually configured, and does a message actually arrive?
//
// This is the one thing no other suite can tell you. sendNurtureEmail() is
// written to fail closed, so a missing key, an unverified domain and a wrong
// EMAIL_FROM all look identical from the outside: "skipped". The cron reports
// success, the ledger fills in, and nobody has been emailed. Until October
// that was theoretical; with a design partner's families in the database it
// is the difference between a waiting room and a filing cabinet.
//
//   node scripts/resend-check.mjs .env.local
//   node scripts/resend-check.mjs .env.local --send you@example.com
//
// Read-only without --send. It touches no database and creates no records, so
// unlike the other scripts in here it is safe against production config.
import { loadEnv } from "./lib.mjs";

const args = process.argv.slice(2);
const envPath = args.find((a) => !a.startsWith("--")) ?? ".env.local";
const sendIdx = args.indexOf("--send");
const recipient = sendIdx >= 0 ? args[sendIdx + 1] : null;

const env = loadEnv(envPath);
const results = [];
const pass = (n, d = "") => { results.push(["PASS", n, d]); console.log(`  PASS  ${n}${d ? " — " + d : ""}`); };
const fail = (n, d = "") => { results.push(["FAIL", n, d]); console.log(`  FAIL  ${n}${d ? " — " + d : ""}`); };
const skip = (n, d = "") => console.log(`  ....  ${n}${d ? " — " + d : ""}`);

console.log(`\nresend-check against ${envPath}\n`);

const key = env.RESEND_API_KEY;
const from = env.EMAIL_FROM;

// ---- 1. configuration present -------------------------------------------
key
  ? pass("RESEND_API_KEY set", `${key.slice(0, 3)}… (${key.length} chars)`)
  : fail("RESEND_API_KEY set", "empty — send.ts will skip every send silently");

if (from && !from.includes("example.com")) {
  pass("EMAIL_FROM set", from);
} else {
  fail("EMAIL_FROM set", from ? `still the placeholder: ${from}` : "empty");
}

// "Porchlight <hello@porchlightfostercare.org>" -> porchlightfostercare.org
const addr = from?.match(/<([^>]+)>/)?.[1] ?? from ?? "";
const fromDomain = addr.split("@")[1]?.toLowerCase();

// ---- 2. the key works, and the domain is verified ------------------------
//
// The app only ever calls POST /emails, so the right key here is a *sending*
// key restricted to the one domain — not full access. A restricted key cannot
// read /domains, and that refusal is the correct answer, not a failure. So a
// restricted key is reported as good news and the live send becomes the only
// real proof; a full-access key gets the extra domain check for free.
let domains = null;
let restricted = false;
if (key) {
  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => ({}));
  const looksRestricted =
    body?.name === "restricted_api_key" || /restricted/i.test(body?.message ?? "");

  if (res.ok) {
    pass("API key accepted by Resend", "full access — domain check available below");
    domains = body.data ?? [];
  } else if (looksRestricted) {
    restricted = true;
    pass("API key accepted by Resend", "sending-only key — least privilege, as it should be");
    skip("EMAIL_FROM domain verified", "a sending key can't read /domains; --send is the proof");
  } else if (res.status === 401 || res.status === 403) {
    fail("API key accepted by Resend", `HTTP ${res.status} — key is wrong or revoked`);
  } else {
    fail("API key accepted by Resend", `HTTP ${res.status}`);
  }
}

if (domains) {
  const names = domains.map((d) => `${d.name} (${d.status})`).join(", ") || "none";
  const match = domains.find((d) => d.name?.toLowerCase() === fromDomain);

  if (!match) {
    fail("EMAIL_FROM domain exists in Resend", `${fromDomain ?? "?"} not among: ${names}`);
  } else if (match.status !== "verified") {
    // The trap: Resend accepts the domain immediately and only verifies once
    // DNS propagates, so this can read "pending" for hours after it looks done
    // in the dashboard. Sending from a pending domain fails at send time.
    fail("EMAIL_FROM domain verified", `${match.name} is "${match.status}", not "verified"`);
  } else {
    pass("EMAIL_FROM domain verified", `${match.name}${match.region ? ` (${match.region})` : ""}`);
  }
}

// ---- 3. a real message, only when asked ---------------------------------
if (!recipient) {
  skip("live send", "pass --send you@example.com to actually deliver one");
} else if (!key || (!domains && !restricted)) {
  skip("live send", "configuration failed above; not attempting");
} else {
  // Same shape as sendNurtureEmail: text body, and the RFC 8058 one-click
  // headers Gmail and Outlook read. If those are malformed the message still
  // arrives, so eyeball the unsubscribe button in the client rather than
  // trusting this script's PASS.
  const base = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: recipient,
      subject: "Porchlight send-path check",
      text:
        "This is the Porchlight send path proving itself.\n\n" +
        "If you are reading this, the API key, the verified domain and the " +
        "From address all agree, and a nurture email can reach a real inbox.\n\n" +
        `Unsubscribe anytime: ${base}/u/send-path-check\n`,
      headers: {
        "List-Unsubscribe": `<${base}/api/unsubscribe/send-path-check>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  res.ok && body.id
    ? pass("live send accepted", `id ${body.id} -> ${recipient}`)
    : fail("live send accepted", `HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  if (res.ok) {
    console.log("\n  Accepted is not delivered. Open the inbox, confirm it is not");
    console.log("  in spam, and check the client's own unsubscribe button appears.");
  }
}

const failed = results.filter((r) => r[0] === "FAIL");
console.log(`\n${results.filter((r) => r[0] === "PASS").length} passed, ${failed.length} failed`);
failed.forEach((f) => console.log(` - ${f[1]}: ${f[2]}`));
process.exit(failed.length ? 1 : 0);
