# Tasks

Active work. Update as items are completed and new work is identified.

## Current milestone

**Milestone 6 — Pilot-safe.** Everything that must be true before The Greenhouse
holds real families in October 2026. Roughly half done.

**The design partner is real.** The Greenhouse, Tucson-focused (Pima has the
highest share of children placed outside their own county; their stated need is
~120 **beds**, not homes). Their own internal outreach pilot starts **October
2026**, scoped to the full loop including nurture email. What we told them is in
`docs/az-priorities.md`; M6–M12 are in `docs/PLAN.md`.

| M6 item | Status |
|---|---|
| Resend account + verified domain | **Done.** SPF/DKIM/DMARC all PASS in real Gmail headers |
| Rate limit `/c/[slug]` + widen slugs (F-006, F-020) | **Done**, on branch |
| Inbound webhook cross-tenant match (F-007) | **Reduced, not closed** — see Tech Debt |
| CI on pull request (F-008) | **Done**, green on GitHub runners |
| `.env.example` tracked (F-009) | **Done**, on branch |
| Privacy policy / DPA / retention / SAR | Open — blocked on the legal entity |
| Throwaway Supabase project | Open — still the highest-leverage item |
| Secrets **and the repo** out of Dropbox (F-010) | Open |
| Cron heartbeat + error reporting (F-011) | Open — needs a migration |
| Prove the live site with a human | Open — three items below |

**Nothing above is merged.** It sits on `m6-pilot-safe`, nine commits, CI green,
open as PR #1. Migrations **0001–0012** applied; **0013 is not yet written** and
should not be until the video chat (below).

Live at https://porchlightfostercare.org — `docs/deploy-setup.md` is the runbook.

The engineering audit in `docs/audit/` is still the reference list for anything
not covered here. Note F-001 and F-003 carry corrections that downgraded them.

---

## Next

1. **Merge PR #1.** Nine commits, CI green. Consider whether the docs commit
   (`az-priorities.md`) should land before or after The Greenhouse has seen it —
   it commits us in writing to "before October" on geography, capacity and
   placement types.
2. **The video chat with The Greenhouse.** This gates migration 0013 and
   therefore all of M7: their touch-channel vocabulary and their placement-type
   terms belong *in* that migration rather than being guessed and rewritten.
   Also on the agenda: the unlabeled "B. About 2600" from their email, and the
   congregate discrepancy (we cite 808, they were given ~1,500 — likely
   congregate care vs all non-family settings). Neither number goes near a board
   pack until that is settled.
3. **A throwaway Supabase project.** Every verification still writes to the
   database production uses, the suites only run when somebody remembers, and
   migrations are hand-pasted. This unblocks suites-in-CI at the same time.
4. **Legal entity decision.** Gates the privacy policy, the Resend DPA, any
   contract with The Greenhouse, and Twilio A2P. Likely the real critical path
   now that Resend is cleared.
5. **Domain warming — a scheduling item, not a technical one.** The first real
   send landed in spam, which is normal for a days-old domain but does not fix
   itself. Reputation comes from consistent mail people open, over weeks. If The
   Greenhouse's first nurture emails go out cold in October, a share land in
   spam and the waiting-room mechanic fails quietly while the ledger reports
   success. Register at Gmail Postmaster Tools and start small real volumes now.
6. **Finish proving production** — the three things a terminal cannot check:
   - [ ] Sign in at `porchlightfostercare.org/login` and confirm the emailed
         link resolves (delivery, not just link generation)
   - [ ] Scan a printed QR from a phone on mobile data; contact lands on `/board`
   - [ ] Tap the hamburger on a real phone. Verified at ~700px in a desktop
         window, never on a device.
7. **Cron heartbeat** (F-011) — needs a `cron_run` table, so it queues behind a
   hand-applied migration.
8. **Playwright e2e** (event → QR capture → board → stage change) and the
   throttled-3G check on `/c/[slug]`.

## Email — the send path, and what it still cannot do

Configured and verified as of 2026-08-09. `scripts/resend-check.mjs .env.local`
re-checks it in two seconds and is safe to point at production config.

- Sending domain is **`contact.porchlightfostercare.org`**, a subdomain — not
  the apex. `EMAIL_FROM` must be an address at that subdomain or every send is
  rejected. The key is **sending-only**, scoped to that domain; the app calls
  exactly one Resend endpoint (`POST /emails`), so full access is never needed.
- The `send.contact` MX record is **SES bounce handling**, not inbound mail.
- **Nothing can receive replies yet.** No MX for a human-readable address, and
  `send.ts` sets no `reply_to`, so a reply goes to an address that does not
  accept mail — while four nurture templates explicitly invite one.
- **`EMAIL_FROM` is a single global variable.** A family who met The Greenhouse
  receives mail from "Porchlight", a name they have never heard. The cheap fix
  needs no migration: the agency name is already in the database and can be the
  sender display name. A per-agency reply-to address does need storage, so it
  belongs in 0013.

## Arizona data upkeep

Refresh twice a year, by hand — `dcs.az.gov` 403s every server-side fetcher, so
a human with a real browser is part of the pipeline.

1. Download both workbooks into `az_docs/` (gitignored) — links and tab layout
   in `docs/az-data-sources.md`.
2. `node scripts/az-stats-import.mjs` to see the diff.
3. `node scripts/az-stats-import.mjs --apply` to write it.

Update the filename and `az_stat_source` title constants at the top of the
script when the reports change edition.

**Nothing from The Greenhouse's brief enters `az_stat` until it is traced to a
primary DCS document.** ADR-011's `Cited` refuses an unsourced figure at the
type level, and their own covering note calls the document poorly organised.

## Applying migrations

**Paste it into the Supabase SQL editor. Do not use `supabase db push`.** Push
applies everything absent from `supabase_migrations.schema_migrations`, and
because every migration here was pasted by hand rather than run through the CLI,
that table is empty. A push would try to re-run `0001` onward, and those are
forward-only and not idempotent. If CLI pushes are ever wanted, backfill history
first with `supabase migration repair --status applied` for each existing file.

Write new migrations **re-runnable** (`drop ... if exists`, `create or replace`),
because a hand-paste that half-fails gets pasted again. 0011 and 0012 are; the
earlier ones are not.

**Never merge code that depends on an unapplied migration** — `/ledger` was down
on `main` for a stretch because the page called RPCs that did not exist yet.

**Run `node scripts/anon-audit.mjs .env.local` after any migration that adds a
function or a policy.** It has caught two real holes that nothing else would.

- [ ] Confirm which Vercel environments carry `CRON_SECRET` and
      `INBOUND_WEBHOOK_SECRET`. `RESEND_API_KEY` and `EMAIL_FROM` are set for
      Production and Preview.

## Blocked

- [ ] Twilio A2P 10DLC registration — needs a legal business entity/EIN
- [ ] Privacy policy, Resend DPA, retention period, subject-access path — needs
      the same entity decision. **M10's demographic work is gated behind this**,
      not the other way round.

## Bugs

- (none open)

## Tech Debt

- [ ] **The inbound webhook is the only thing that can pause automation.** There
      is no manual pause anywhere in the UI — `automation_paused_at` is written
      by the webhook and cleared by "resume", nothing else. So a family who
      replies while inbound is unwired keeps receiving scheduled email, and a
      recruiter's only lever is an irreversible opt-out. A manual pause button
      is small, needs no migration, and removes a single point of failure.
- [ ] **F-007 is reduced, not closed.** Matching is now exact and refuses
      ambiguity, so the wildcard-injection route is gone. The real fix carries
      the tenant in the reply address so a reply resolves by token rather than
      by matching a string across every agency — that needs `send.ts` plus token
      storage, i.e. a migration.
- [ ] **CI publishes 93 lint warnings as PR annotations**, all from the
      `scripts/*.mjs` assertion idiom (F-018). Every future PR will carry ~93
      inline comments, which is exactly how a signal becomes wallpaper. Cheapest
      fix is an eslint override for `scripts/**`.
- [ ] **Dropbox is syncing `.git` and `.next`, not just secrets.** Files created
      mid-session appeared as already committed under an unchanged HEAD, and
      Turbopack's cache DB corrupted with missing `.sst` files. F-010 scoped this
      to secrets at rest; repository integrity is the larger consequence.
- [ ] `sendNurtureEmail` is email-shaped at every seam while ADR-003 records the
      layer as channel-agnostic; build the seam before the Twilio registration
      clears, not after (audit F-014)
- [ ] `createAdminClient` is a bare factory with no rule about who may call it;
      enforce ADR-013's invariant with an eslint `no-restricted-imports`
      (audit F-012 follow-up)
- [ ] A send that crashes mid-flight leaves a `sending` row that never retries
      (deliberate: prefers a missed email to a double-send)
- [ ] Board has no drag-and-drop; per-card `<select>` is the mechanism
- [ ] Board caps at 2,000 cards. Visible on the page, but a real fix is windowing
- [ ] Suites aren't in CI — needs a throwaway Supabase project
- [ ] Invitations aren't emailed; the recruiter copies the link and sends it
- [ ] `delete_demo_data()` doesn't clear `agency_county`, `agency_target` or
      `agency_invite` — `seedDemoAgency` clears them itself, so a rebuild is
      still identical, but "empty it out" leaves them behind
- [ ] Onboarding progress is only reachable from a contact's page; there is no
      "who's in onboarding" list
- [ ] eslint 9 → 10 migration clears 9 dev-only advisories; ordinary
      maintenance, not security (audit F-001)

### Closed 2026-08-09 (on `m6-pilot-safe`, PR #1)

- ~~No Resend account; no email had ever been sent~~ — sending-only key, domain
  verified, DMARC added, a real message delivered with SPF/DKIM/DMARC all PASS
  and a DKIM-signed one-click unsubscribe header. **Placement is still spam** —
  that is reputation, not configuration.
- ~~No rate limit, honeypot or format check on `/c/[slug]`~~ (F-006) — honeypot,
  validation, length caps, best-effort throttle. Both guards tested end to end.
  The throttle is per-instance and in-memory; a durable one needs a migration.
- ~~Capture slugs were ~20 bits with modulo bias~~ (F-020) — 8 chars with
  rejection sampling, verified over 200k slugs (first-8-vs-rest ratio 0.9991).
- ~~No CI, no branch protection~~ (F-008) — typecheck, lint, build on PR and
  push to main; advisory `npm audit`. Build proven to work on placeholder env.
- ~~`.gitignore` excluded `.env.example`~~ (F-009).
- ~~Manually logged conversations recorded as inbound regardless of who reached
  out~~ — found while answering the design partner's question about touch-point
  tracking, which was the feature they most wanted to hear about.
- ~~`cron-test.mjs` would have sent real mail to `@example.test` addresses~~ —
  it seeded a non-demo agency and asserted `send_log` was empty, which was only
  true because no provider was configured. Turning the key on changed the safety
  profile of a test that had not moved. Its agency is now `is_demo`.
- ~~Two forgotten `[LIVE]` test tenants would have been emailed by the next
  production tick~~, including a real stranger's Gmail address. Marked
  `is_demo`; verified zero real sends pending. The demo guard (ADR-010) held for
  the seeded agency's 179 consenting contacts — exactly the scenario its comment
  predicted.

### Closed by the audit (2026-07-26)

- ~~`/ledger` aggregates in TypeScript over every contact~~ — moved to
  `ledger_rows()` in 0012. Filed as performance; the real defect was silent
  under-reporting past 1000 rows (F-002)
- ~~No way to add a contact outside an event~~ — `/contacts/new` with a required
  source picker
- ~~Sources can never be deleted~~ — delete on the event page, refused once
  anyone was captured
- ~~Unusable on a phone~~ — hamburger nav, swipeable board, card layouts
- ~~`role` was self-editable~~ — trigger in 0011 (F-003, ADR-013)
- ~~Unsubscribe opted people out on GET~~ — asks on GET, writes on POST, RFC 8058
  one-click endpoint (F-004)
- ~~Service-role client on a public route~~ — `public_unsubscribe()` in 0011 (F-012)
- ~~System endpoints accepted `"Bearer undefined"`~~ — `verifySystemSecret()` (F-005)
- ~~No release tag~~ — `v0.6.0` (F-016)

### Closed by M5

- ~~Onboarding creates one agency per user via the service role~~ — replaced by
  `create_agency()` in 0009 (ADR-012)
