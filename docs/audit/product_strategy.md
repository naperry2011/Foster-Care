# Product Strategy

A read of intent from the code, the schema and the docs. This is the least certain
document in the audit: strategy read out of a repository is inference, and the
person who built it knows things the code does not say. Questions that would sharpen
this are listed at the end.

---

## 1. What this project is trying to be

The wedge is unusually clear, and the code agrees with the pitch, which is not
always true.

**The claim:** every tool an agency owns (Binti, Casebook, CCWIS) starts at the
application. Everything upstream of that is a shoebox of business cards and a
recruiter's memory. Porchlight owns the upstream, from the moment somebody says
"maybe" at a church fair to the moment they become a licensed home two years later.

**The evidence in the schema, not the marketing:**

- `not_yet` is a first-class value in the `contact_stage` enum with a `wake_up_on`
  date column, an index, and a cron phase dedicated to it. A product that regarded
  "not yet" as a failure would have called it `declined` and moved on. Migration
  0003 goes further and makes the database default a wake-up date when a recruiter
  forgets one, on the stated grounds that a contact without a clock falls into "the
  exact graveyard this product exists to prevent". That is a product thesis
  implemented as a `coalesce`.
- `contact.source_id` is `NOT NULL` and immutable by trigger. Attribution is not a
  reporting feature bolted on later; it is a structural constraint that the schema
  will not let you violate.
- Erasure preserves the `source` and its cost, so the ledger's denominators stay
  honest even after a person is deleted (ADR-007). Somebody thought about what
  happens to the economics when the data changes.
- CSV contact import is refused on purpose (README). That is a real product
  decision with a real cost, and the reasoning is that a list with no record of how
  those people were reached would turn Porchlight into the thing it exists to
  replace.

**Target user and buyer.** Arizona private licensing agencies. The buyer is the
recruitment director; the daily user is a recruiter standing at a table with a
phone. The ROI argument is stated plainly in `docs/ai/roadmap.md:7`: one extra
licensed home pays for the software. Given the state-level numbers in the README
(4,875 licensed homes down to 1,859 across SFY17 to SFY25, with 1,046 more needed
inside twelve months), the market pain is real and documented rather than asserted.

**What it refuses to be.** Home-study workflow, case management, anything touching
child data, a caregiver-facing app, group-home compliance. The fence is restated
inside ADR-008 in the context of onboarding progress, and the product records
*whether* a requirement is cleared and nothing else: no documents, no signatures,
no assessments. It is called "onboarding progress", never "licensing". That
discipline is worth a great deal in this market, because the moment child data
enters the system the compliance surface changes category.

## 2. Where it is versus where it should be

**Where it is.** Technically complete for a single-event pilot and deployed on its
own domain. All five milestones are done, ten migrations applied, five verification
suites reported green. What it has never done is the thing it exists to do: no
nurture email has ever been sent, and no real agency's families are in it.

That is the honest gap, and the maintainer states it in exactly those terms in
`docs/ai/roadmap.md:12-13`. The audit's contribution here is to point out which of
the untested surfaces are most likely to bite on first contact, because they cluster
on the same path:

| Path | Status | Audit finding |
|---|---|---|
| QR scan to captured contact | Built, never scanned from a real phone on mobile data | F-006 (no abuse control on the only public write path) |
| Nurture email delivered | Built, never sent | F-004 (scanners will silently and irreversibly unsubscribe recipients) |
| Reply pauses automation | Built, never received | F-007 (the reply can land in the wrong tenant) |
| Wake-up fires a task | Built, never fired for a real person | BUG-004 (a wake-up can be marked fired without a task) |
| Ledger shows cost per home | Built, never populated with real outcomes | F-002 (silently under-counts past 1,000 contacts) |

Every step of the demo narrative has an unexercised defect on it. None is
architectural, and all five are small fixes, but they are on the critical path of
the first design partner's first month, which is the least forgiving moment this
product will have.

**What the product premise implies but does not yet have.**

- **Spanish.** `docs/ai/roadmap.md:44` lists it as non-negotiable for Maricopa and
  Pima at scale, and it is correct. Arizona's foster-parent recruitment problem is
  substantially a Spanish-speaking-household recruitment problem. The capture page
  is the cheapest place in the product to add a second language and the most
  valuable, because it is the one screen a stranger sees.
- **Anything an agency does weekly.** The product's value accrues over 12 to 24
  months; the recruiter's attention does not. `/tasks` and the cron's five phases
  are the answer, but there is no digest email, no "here is your week" view, and no
  reason for a director to open the app between events. Retention risk sits here,
  not in the feature set.
- **A second reason to keep paying.** The ledger closes the sale but pays off at the
  lag horizon. For the first year, the agency is paying for a promise. The waiting
  room callout on `/ledger` is the right instinct: it shows value before outcomes
  arrive. There should be more of that.

## 3. Sequence after the audit fixes

Horizons 1 and 2 in `report.md` cover the engineering. What follows assumes they are
done.

**First, one design partner, one event, end to end.** Not a pilot program: one
Saturday, one QR code, one recruiter's phone, and every subsequent step actually
happening to real people. Everything in section 2's table gets exercised in one
weekend. This is worth more than any feature, because it converts five unexercised
paths into either confidence or a defect list.

**Second, the weekly habit.** A Monday digest email to the recruiter with open
tasks, wake-ups landing this week, and anyone who has gone quiet. The cron already
computes all of it and writes it to `task`; nothing pushes it. This is the cheapest
retention mechanism available and it uses the send layer that will already have been
proven by step one.

**Third, Spanish on the capture page and the first nurture sequence.** Before scale,
not after. It affects the schema lightly (a language column on `contact`, a language
key on `nurture_template`) and the schema is easiest to change now.

**Fourth, the onboarding list.** Already logged as tech debt (`tasks.md:70`):
progress is only reachable per contact, so there is no "who is in onboarding" view.
That is the screen a director looks at, and directors are the buyer.

**Fifth, and only when a design partner asks, the Binti handoff.** ADR-005 sets the
right trigger. Building an integration nobody has asked for is the classic way this
category of product loses a year.

SMS sits outside this sequence because it is blocked on a legal entity and a 4 to 8
week A2P registration. The relevant point for sequencing is F-014: the send layer's
channel seam should be built while the registration is pending, not after it clears.

## 4. Strategic angles

Offered as options, with an honest confidence level on each.

**The attribution data is the moat, and it compounds.** After two years across
several agencies, Porchlight would hold something nobody else has: which recruitment
channels in Arizona actually produce licensed homes, at what cost, at what lag. No
incumbent can compute it because none of them can see upstream of the application.
That is a defensible position and it strengthens with every agency added. It is also
the thing to be careful with: any cross-agency benchmark product has to be
aggregate-only and consented, and the current architecture (one user, one agency, no
cross-tenant read path anywhere) is deliberately hostile to building it, which is
the right default.

**State and philanthropy are a plausible second buyer.** Arizona DCS publishes a
target of 1,046 additional homes and has no visibility into the pre-inquiry funnel
across its contracted agencies. A rollup view is already listed as a v2 item. The
same caution applies, and more strongly: a state-facing product changes the
compliance posture and the sales cycle length at the same time. Worth understanding,
not worth building toward yet.

**The Arizona dashboard is doing more work than it looks like.** As a feature it is
a reference page. As a sales asset it is proof that the vendor understands the
domain, and the `Cited` provenance discipline (ADR-011) means a director can put a
Porchlight screenshot in a board pack without checking it. That is a credibility
device that costs almost nothing to maintain twice a year.

**What I would be cautious about.** Widening scope toward the application itself.
Every gravity in this market pulls that way, because that is where the incumbent
budget sits. The refusal is what makes the product legible, and the README's
"deliberately not built" list is an asset rather than a limitation.

**What I do not know.** Whether recruitment directors will pay for a tool whose
headline number arrives in 18 months. The waiting-room callout is a good partial
answer, and one design partner will tell you more than any amount of reasoning here.

## 5. Questions for the owner

These would sharpen the analysis materially. Each one changes a recommendation
above.

1. **Has any Arizona agency seen this yet, and what did they say?** The entire
   section 3 sequence assumes the wedge lands. One conversation would confirm or
   redirect it.
2. **What is the intended price, and against what budget line?** Software, or
   recruitment spend? The ledger's cost-per-home framing implies the latter, which
   is a different sale and a different buyer.
3. **Is this a business or a project?** The A2P blocker (`tasks.md:55`) says there
   is no legal entity yet. That gates SMS, a Resend production account at volume,
   and any contract, so it may be the real critical path rather than anything in the
   code.
4. **Is a second contributor coming?** Several audit recommendations (CI, branch
   protection, `.env.example`) are worth more with two people and are merely tidy
   with one. F-009 in particular is a bus-factor item.
5. **Do you intend to hold data for more than one agency simultaneously during the
   pilot?** If yes, F-003 and F-007 move up in priority, because both are
   cross-tenant issues that are inert while there is exactly one real tenant.
6. **What does the design partner's existing recruitment process look like today?**
   Whether Porchlight replaces a spreadsheet, a Mailchimp list or nothing at all
   changes which feature is the wedge and which is table stakes.

---
generated_by: codebase-audit skill v1.1
generated_on: 2026-07-26
project: C:\Users\Perry\Dropbox\PC\Documents\GitHub\Foster-Care
project_type: node
verification: full
---
