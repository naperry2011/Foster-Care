# Porchlight against Arizona's recruitment priorities

*A response to The Greenhouse's Arizona Foster Care Landscape brief, August 2026. Written for a recruitment director. Companion documents: [overview.md](overview.md) for what Porchlight is, [workflow.md](workflow.md) for how it runs day to day.*

---

## First, the question you asked

> *"Will it be able to track families across touch points? Is there a way to track every way we've made contact with them?"*

**Yes — and it is the part of the product we are most confident in.**

Every interaction with a family is written to an append-only record: who reached out, which channel, when, and what was said. Open a family's page and you get one column, newest first, merging four separate streams:

- **Conversations** — phone calls, texts, emails, meeting them in person. Logged by you, or captured automatically.
- **Stage changes** — every move through the funnel, with the date, and who moved them.
- **Automated email** — every nurture note the system sent, with its subject line, sitting inline with your own conversations so you can see what the family actually received between your calls.
- **Tasks** — wake-ups that fired, replies that came in, families who went quiet.

Two years from now a different recruiter opens that page and reads the whole relationship in fifteen seconds.

Three things worth knowing, because they are the honest edges of that answer:

1. **The channels we model today are phone, text, email and in person.** If your team also reaches families through social media messages, WhatsApp, or physical mail, those have no home yet. Tell us which ones you actually use and we will add them — it is a small change, and we would rather match your vocabulary than make you match ours.
2. **Text messaging is not live.** It exists in the data model but Porchlight cannot send or receive SMS yet; that is gated on carrier registration which requires a registered business entity. You can log texts you sent yourself; the system cannot send them for you.
3. **Nothing can be edited or deleted after the fact.** That is deliberate — the record is only worth something if it cannot be quietly rewritten — but it means a typo is corrected by adding, not editing.

---

## Where Porchlight sits in DCS's 2025 priorities

Your brief lists five strategic priorities. Porchlight is honestly relevant to two of them. Claiming more would waste your time.

| DCS priority | Porchlight |
|---|---|
| 1. Prevention | **Not us.** Upstream of placement entirely. |
| 2. Timeliness to Permanency | **Not us.** Case-level work, after a child is placed. |
| 3. Diversity, Equity, Inclusion and Accessibility | **Partly.** We can make your recruitment pipeline's composition visible and measurable — see below. |
| 4. Professional Development | **Not us.** |
| 5. Family-like settings | **Directly.** Everything Porchlight does serves the recruitment strategy underneath this priority. |

Priority 5 lists four strategies. Three of them are recruitment, and recruitment is the whole product.

---

## Against Arizona's stated recruitment goals

### Kin First Culture

**Today:** Nothing. This is the largest gap between what Porchlight does and what Arizona is asking for, and we would rather say so than dress it up.

**Why it matters more than anything else in this document:** the state publishes 2,193 unlicensed kinship homes against 222 licensed ones — roughly ten to one (DCS Semi-Annual Child Welfare Report, March 2026, as of 31 Dec 2025). Those families already have the child. They are not being recruited, they are being **converted** — and licensing roughly doubles what they receive, on a 60–90 day timeline rather than the twelve-to-twenty-four month arc of recruiting a stranger. It is a faster, higher-yield funnel than the one we built.

**Plan:** a kinship marker ships before your October pilot, so any kin family you capture is tagged from the first day rather than sorted out by hand later. The full kinship funnel — its own checklist against the Gold Standard timeline, its own messaging, its own line in the ledger — comes after the pilot, deliberately, so it is shaped by what you actually see rather than by what we assume. Our current messaging is written to persuade someone who has never considered fostering; sending that to a grandmother who already has her grandchildren asleep upstairs would be wrong.

### Congregate care reduction

**Today:** Indirectly — every home you license is a placement that does not have to be congregate.

**Plan:** when a home takes a child stepping down from a group placement, that will be recordable on the home's record, alongside the incentive it carries.

**Never:** anything about the child, and no group-home or QRTP compliance tooling. Porchlight holds records about prospective foster parents, and that is the whole of it.

### Families who match the racial diversity and culture of children in care

**Today:** Nothing. We collect no demographic information at all.

**Plan:** optional, self-reported race, ethnicity, language and tribal affiliation on a family's profile, so your pipeline's composition is visible and your outreach can be aimed rather than guessed at. This also unblocks Spanish-language capture, which we consider overdue.

**How we intend to handle it:** this is the most sensitive data the product will ever hold, so it lands *after* a written privacy policy, a documented retention period, a data-processing agreement with our email provider, and a clean way for a family to request deletion — not before. It will be self-reported and optional, never inferred from a name or a photograph. We would rather ship it late and correctly.

### Regular, respite, medically complex and therapeutic homes

**Today:** Nothing. A licensed home is a licensed home; the ledger cannot tell you that one Saturday produced three therapeutic homes and another produced three respite-only ones.

**Plan:** before October, a family profile recording which placement types they are open to. **We would like your vocabulary for this, not ours** — the terms your team uses with families are the ones that should be on the screen.

### Homes for sibling groups and older children

**Today:** Nothing.

**Plan:** before October — capacity, whether they will take a sibling group, and the age range they are open to. This is also what lets us talk in beds, which matters for the next section.

### Recruiting in the communities where children are

**Today:** Partly, and weakly. Porchlight knows which *event* a family came from, but a family record carries no location at all — so it cannot yet answer "how many homes did we license in Pima?"

**Plan:** before October — county and postal code on a family, and county on your goals, so your Tucson target becomes a number that fills in rather than a line of text.

---

## Your Tucson focus, and a units problem worth naming early

You said you are focused on Tucson because Pima has the highest share of children placed outside their own county, and that the need there is about 120.

**That figure is in beds. Porchlight counts homes.** The two are not interchangeable — the average Arizona foster home is licensed for about two children — and if we let them drift together, a number in your board pack will eventually be wrong.

How we will handle it: **homes stay the headline**, because a home is what you license and what you are paid for. Where your goal is stated in beds, the bed figure appears next to the home figure, and it is calculated by adding up the capacity you actually recorded — never by multiplying homes by a statewide average. If some families have no capacity recorded, the screen will say how many, rather than quietly guessing.

---

## Questions for our video chat

You offered detail on per-county need, specialization and race. Yes please. Alongside that, four things we could not resolve from the documents:

**1. The unlabeled figure.** Item B in your email — *"About 2600"* — carries no label. What is it counting?

**2. Congregate care does not reconcile, and the gap is large.**

| | Figure | Source |
|---|---|---|
| Your email (DCS, March 2025) | ~1,500 children | provided to you directly |
| Your attached brief | 1,300 "in these placements", ~350 under age 12 | brief, undated |
| What we currently show | 808 children in congregate care | DCS Semi-Annual Child Welfare Report, March 2026 — as of 31 Dec 2025 |

808 against 1,500 is too big to be a timing difference. We suspect it is a definitional one — congregate care as DCS reports it, versus all non-family settings including group homes and shelters. **We would rather not put either number in front of your board until we know which is which.**

**3. Children in care, and homes needed, look like timing differences — but let us confirm.** Your March 2025 figures (~7,600 children; ~900 homes needed statewide) sit against the more recent published ones we carry (8,183 children as of Dec 2025; 1,046 homes needed). Both trends are moving the wrong way, so both can be right at their own dates. We just want to be sure before either appears anywhere.

**4. Your touch-point vocabulary and your specialization terms.** Which channels does your team actually use to reach families, and what do you call the different kinds of home? Both go straight onto the screen.

---

## What Porchlight will not do

Worth stating plainly, because your brief covers a great deal of ground that we deliberately stay out of.

- **No child data, ever.** There is no table for it. When we record a step-down, it is a fact about the *home*, never about a child.
- **No home study, no case management, no licensing workflow.** We hand off at the inquiry. Your licensing system stays the system of record, and we do not try to replace it.
- **No group-home or QRTP compliance tooling.** Your brief describes it in detail; it is context for us, not scope.
- **No family-facing app.** The only two pages a family ever sees are a ten-second form and an unsubscribe page.
- **No importing a contact list.** A spreadsheet of names with no record of how any of them were reached is the exact thing this product exists to replace, and loading one would corrupt the attribution on day one. Homes you have already licensed can be recorded, attributed to the source that actually produced them.

---

## A note on every number we show you

Porchlight will not display a public statistic without its publisher, a link, and the date it describes — that is enforced in the code, not by policy, so there is no way for an unsourced figure to reach a screen. Your own goals are stored separately from state figures and rendered differently, so the two can never be mistaken for one another in a board pack.

The consequence for this document: the figures in your brief are not in the product yet. Before any of them are, we will trace each one back to the DCS publication it came from. Where a claim in the brief is an advocacy position rather than a published measurement, we will leave it out entirely.
