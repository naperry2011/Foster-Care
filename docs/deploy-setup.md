# Production setup — porchlightfostercare.org

Everything that lives outside the repo: Vercel environment, DNS, and the
Supabase settings that have to agree with both. No secrets in this file — the
generated values are in `.env.vercel.local`, which is gitignored.

Do the steps in order. Step 4 is the one people skip, and skipping it breaks
sign-in without any error message that says so.

---

## 1. Vercel environment variables

Vercel dashboard → your project → **Settings → Environment Variables**. Set all
of these for **Production** (and Preview, if you want preview deploys to work).

| Variable | Where the value comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | copy from your local `.env.local`, unchanged |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | copy from `.env.local`, unchanged — safe to expose, it ships in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | copy from `.env.local`. **Sensitive.** Bypasses every RLS policy in the database |
| `NEXT_PUBLIC_APP_URL` | `https://porchlightfostercare.org` |
| `CRON_SECRET` | from `.env.vercel.local` (freshly generated) |
| `INBOUND_WEBHOOK_SECRET` | from `.env.vercel.local` (freshly generated) |
| `EMAIL_FROM` | `Porchlight <hello@porchlightfostercare.org>` |

Leave `RESEND_API_KEY` **unset**. `src/lib/send.ts` checks for it and skips
sending cleanly when it is missing — no half-written rows, nothing to clean up
later.

**The dev values are not reusable.** `.env.local` has `CRON_SECRET=dev-cron-secret…`
and `INBOUND_WEBHOOK_SECRET=dev-inbound-…`. Those guard `/api/cron/tick` and
`/api/webhooks/inbound`; a guessable one in production means anyone can drive
your automation or post fake inbound replies. `.env.vercel.local` has 256-bit
random replacements. Keep the dev values locally so the test scripts keep
working — they should differ.

---

## 2. Add the domain in Vercel

Vercel → project → **Settings → Domains** → add `porchlightfostercare.org`.

Add `www.porchlightfostercare.org` too, so people who type "www" still arrive.

**Whichever one you set as Vercel's primary domain must be the one in
`NEXT_PUBLIC_APP_URL`.** The other redirects to it, and that redirect lands on
the capture page — the single page with a sub-second budget on a bad connection.
Measured on the live site: apex → www costs an extra round trip, 0.56s against
0.26s direct. Harmless on wifi, a real cost on 3G in a church hall, on exactly
the path a scanned QR code takes.

Vercel → Settings → Domains shows which is primary. Point `NEXT_PUBLIC_APP_URL`
at that one (and redeploy if you change it — the value is compiled in).

**Do not copy DNS values out of a blog post.** Vercel's own docs say the
commonly quoted `76.76.21.21` and `cname.vercel-dns.com` are *general* values
and that you should read the specific records for your domain. After adding the
domain, Vercel shows you exactly what to create. Use those.

If you'd rather see them in a terminal:

```bash
npx vercel domains inspect porchlightfostercare.org
```

---

## 3. Namecheap DNS

Namecheap → Domain List → **Manage** → **Advanced DNS**.

1. **Delete the two records Namecheap adds by default** — a `CNAME` for `www`
   pointing at `parkingpage.namecheap.com`, and a `URL Redirect Record` on `@`.
   Leaving either in place will fight whatever you add and the domain will
   intermittently serve a parking page.
2. Add the records Vercel gave you in step 2. Host `@` is the apex, host `www`
   is the subdomain. TTL: **Automatic**.
3. Wait. Namecheap usually propagates in minutes; Vercel's Domains page flips
   to "Valid Configuration" on its own, and issues the TLS certificate.

---

## 4. Supabase — allow the new domain to sign people in

**This is the step that silently breaks things.** Supabase only redirects magic
links to URLs it has been told about. Point the domain at Vercel without doing
this and sign-in links will bounce people to `localhost:3000`, which works fine
on your machine and for nobody else.

Supabase dashboard → project `ygryunmvgyuqjxkumbmu` → **Authentication → URL
Configuration**:

- **Site URL**: `https://porchlightfostercare.org`
- **Redirect URLs** — add all of these:
  - `https://porchlightfostercare.org/**`
  - `http://localhost:3000/**` (keep it, or you can't develop)

The `/**` wildcard matters: `src/app/auth/callback/route.ts` appends `?next=…`
when someone follows an invitation link, and an exact-match entry won't allow it.

---

## 5. Redeploy

`NEXT_PUBLIC_*` variables are inlined **at build time**, not read at runtime.
Setting `NEXT_PUBLIC_APP_URL` in the dashboard changes nothing until the app is
rebuilt — the old value stays compiled into the bundle.

Vercel → **Deployments** → most recent → **⋯ → Redeploy**. Uncheck "Use existing
build cache" so it genuinely rebuilds.

---

## 6. Verify

Verified live on 2026-07-26: DNS resolving to Vercel with a valid certificate
and the Namecheap parking records gone; `NEXT_PUBLIC_APP_URL` compiled into the
build (no `localhost:3000` anywhere in the served HTML); a signed-out request to
`/arizona` redirecting to `/login?next=%2Farizona`; `/api/cron/tick` returning
401 both unauthenticated **and** with the old dev secret, which is how we know
the production `CRON_SECRET` was genuinely rotated; and `/u/[id]` returning
different pages for a real and a bogus contact id, which is how we know the
deployed server really reaches Supabase.

Note on that last one: `/c/[slug]` is *not* a useful connectivity test. It does
no database lookup on load — it renders a static form and validates the slug
inside `public_capture()` on submit, which is how it stays fast. A nonsense slug
returns 200 exactly like a real one.

Still unverified, because it needs a human inbox: magic-link sign-in.

In this order, because each depends on the last:

1. `https://porchlightfostercare.org` loads the storybook landing page.
2. Sign in with a magic link. The email's link must point at the domain, not
   localhost. *(If it points at localhost, step 4 wasn't saved.)*
3. `/events` → open any event → the QR code's caption reads
   `https://porchlightfostercare.org/c/…`. **This is the thing that was broken**:
   the QR encodes `${NEXT_PUBLIC_APP_URL}/c/${slug}`, so with the old value every
   printed code pointed at localhost and would fail at an event.
4. Scan the QR with a phone on mobile data (not your wifi) and submit. The
   contact should appear on `/board` with its source stamped.
5. Cron: Vercel → **Settings → Cron Jobs**. It runs daily at 15:00 UTC. Vercel
   sends `Authorization: Bearer $CRON_SECRET` automatically, which is exactly
   what `src/app/api/cron/tick/route.ts` checks. You can trigger it by hand from
   that page.

---

## What this does not set up

- **Resend / real email.** Not needed yet, and it cannot be demonstrated anyway:
  the demo agency is refused by `send.ts` and fails closed (ADR-010), so a
  Resend key changes nothing you can show anyone. Do it when a pilot agency has
  real people in the system. `porchlightfostercare.org` is already the right
  domain to verify when that day comes.
- **Twilio / SMS.** Needs a legal business entity and 4–8 weeks for A2P 10DLC.
