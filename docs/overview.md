# What Porchlight is

*A ten-minute read for a recruitment director. If you want the step-by-step mechanics, read [workflow.md](workflow.md) next. If you are a recruiter starting Monday, go straight to [training.md](training.md).*

---

## In one paragraph

Porchlight is pre-inquiry foster-parent recruitment software for Arizona licensing agencies. It is built for the years *before* a family fills out an application — the fair, the church table, the coworker who asked one quiet question. It captures those people in ten seconds, keeps them warm for as long as it takes, and hands them to your licensing team at the moment they raise their hand. Then it tells you which of your Saturdays actually became homes.

It stops at the inquiry. It never becomes your system of record.

---

## The problem it exists for

Arizona is running out of foster homes, and the decline is not slowing.

| | |
|---:|:---|
| **4,875 → 1,859** | licensed foster homes, SFY17 → SFY25 — a **61.9% collapse** <sup>[1]</sup> |
| **1,046** | additional homes the state says it needs, within twelve months <sup>[2]</sup> |
| **8,183** | children in out-of-home care <sup>[3]</sup> |
| **17.2%** | of care days now spent in congregate care — **rising**, against the Department's own goal of a two-point cut <sup>[1]</sup> |

Your agency is judged on licensed homes. But every system you already own — Binti, Casebook, CCWIS — wakes up when somebody submits an application. Everything before that moment is a shoebox of business cards, a spreadsheet somebody started and abandoned, and a recruiter's memory.

That upstream ground is unowned, and it is where the homes actually come from. A person who says *"maybe in a few years"* is not a failure. They are a home that arrives in 2029 — if anybody remembers to keep the light on.

Two things follow from that, and both are hard without software:

1. **The interval is measured in years, not weeks.** Nobody's CRM is designed to hold a warm relationship for thirty months with no activity in between. Most tools would call that person dead.
2. **Nobody can prove what worked.** Because the first touch is never recorded, a home licensed in 2027 cannot be traced back to the fair in 2025. So agencies keep funding the loudest channel instead of the one that works.

---

## The four things it does

### Capture

One field, ten seconds, standing up. You make a QR code for an event on your phone in the parking lot; a visitor scans it and gives you a phone number *or* an email. Name is optional and comes second. There is no login, no form to scroll.

The point is what happens invisibly: the person is stamped with **where you met them**, permanently. That stamp is the whole product. Without it, the ledger at the end cannot exist.

### The waiting room

*"Not yet"* is a first-class status with a wake-up date, not a rejection lane.

When a family says "ask me when my youngest is in school," you record that as a date. The date lives in the database, so it survives every deploy, every staff change and every laptop that dies. When it arrives, a task appears for a human — with the person's name and the promise you made them.

In the meantime they get one quiet, no-pressure note every ninety days. Nothing is asked of them.

### Nurture

Stage-keyed email, never calendar-blasted. Someone who is *curious* gets a different note than someone who is *considering*, and the sequence is timed from when they entered that stage, not from a campaign send date. The default emails answer the questions people are too shy to ask out loud: am I even eligible, what does it cost, what does an ordinary week actually look like.

**One human reply pauses the machine.** The moment somebody writes back, automation stops for that person and a task appears. A recruiter resumes it deliberately, or never. No one gets an automated email in the middle of a real conversation.

### The ledger

The screen your funding depends on. For every source — each event, each ambassador, each ad — it shows people captured, how many are still warm, inquiries, licensed homes, the median lag in months, and cost per licensed home. It prints cleanly for a board meeting.

It also answers the question no other tool in this market can: of everyone who ever said *"not yet,"* how many became homes?

Alongside these, an **Arizona dashboard** puts your numbers next to the state's own published figures. Every statistic on it carries its publisher, a link and an as-of date — and where the state does not publish a figure at the grain you want, the page says so out loud rather than leaving a blank.

---

## What Porchlight deliberately is not

This list matters more than the feature list.

- **No home-study workflow.** That is your licensing system's job.
- **No case management.** Porchlight has never met a child and never will.
- **No child data of any kind.** The database has no table for it. This is not a policy, it is an absence.
- **No caregiver-facing app.** Families do not log in. The only pages they ever see are a ten-second capture form and an unsubscribe page.
- **No group-home or congregate compliance.**
- **No CSV contact import — refused on purpose.** A list of a thousand names with no record of how any of them were reached is exactly the artefact Porchlight exists to replace. Importing one would poison the ledger on day one and quietly turn this back into a spreadsheet with a login screen. There is a supported way to bring history in: see *backfill* in [workflow.md](workflow.md).

Porchlight hands off at the inquiry. Everything after that belongs to the system you already own.

---

## The promises the software keeps

These are not policies written in a manual that a future bug could break. They are enforced in the database itself, which means they survive every future contributor and every future mistake.

- **A contact can never lose the record of where they came from.** Every contact must have a source, and that link cannot be edited afterwards. Attribution cannot be quietly rewritten to make a channel look better than it was.
- **History is append-only.** Stage changes and logged conversations cannot be edited or deleted. What happened is what the record says happened.
- **…with exactly one audited way out.** A person can ask you to delete them, and there is a single, recorded path that erases them completely. It keeps the event and its cost, so your ledger denominators stay honest even after somebody leaves.
- **Consent is checked at the send layer**, the one and only path to the email provider. There is no way to write code that sends around it.
- **Opting out is permanent.** It cannot be undone by anyone, including you.
- **State statistics are unwritable from the app.** Public figures and your own agency's goals are stored in physically separate tables, so a target you set can never be mistaken for something Arizona published.
- **Another agency cannot see your contacts.** Isolation is enforced in the database, not just hidden in the interface — and it is tested rather than assumed.

---

## Roles, and who sees what

Be clear on this before you roll it out, because it is easy to assume otherwise.

Porchlight has two role labels — **director** and **recruiter** — and they are exactly that: **labels, not permission tiers.** Everyone in your agency sees the same board, the same contacts, the same waiting room and the same ledger. Everyone can add, move and erase.

- The first person to create the agency becomes its director automatically.
- Anyone can invite anyone else, and choose which label to give them.
- Nobody can change their own role or move themselves into another agency. That is blocked at the database level.

If your agency needs genuine access control — a recruiter who can see only their own contacts, for example — Porchlight does not do that today. Plan around it rather than assuming it.

One account belongs to exactly one agency. There is no password: sign-in is a magic link sent to your work email.

---

## What you need to run it

- **A Supabase project** — the Postgres database, with every migration applied in order.
- **A Vercel deployment** — one app, one daily scheduled job. No queue, no workers, no second service.
- **An email provider** (Resend) — only needed for nurture email. Everything else works without it.
- **One recruiter who will actually work the task queue.** This is the real dependency. The nightly job does the machine part: it wakes people up, sends the stage-keyed notes, and flags the families who have gone quiet. It cannot make the phone call. A task nobody opens is a family nobody called.

The technical runbook — Vercel, DNS, the Supabase auth URLs that have to agree with both — is in [deploy-setup.md](deploy-setup.md).

---

## Expectations, honestly

**The first year's ledger will look thin, and that is correct.** Licensure lags first contact by twelve to twenty-four months. In month two you will have captured people and warm relationships, not homes. If you judge the tool on licensed homes in the first quarter, you will conclude it does not work, and you will be measuring the lag rather than the tool.

The numbers that mean something early are: people captured per event, how many are still warm, and how many families are sitting in the waiting room with a date on them. Those are the leading indicators. The homes come later, and when they do, you will be able to say exactly which Saturday each one started on.

---

<sup>[1]</sup> Arizona DCS, [Monthly Operational & Outcomes Report, June 2026](https://dcs.az.gov/content/monthly-operational-outcomes-report-june-2026).
<sup>[2]</sup> Governor's Office via KJZZ, [*Arizona just raised foster care pay rates by 50%. State still needs 1,046 more homes*](https://www.kjzz.org/politics/2025-12-05/arizona-just-raised-foster-care-pay-rates-by-50-state-still-needs-1-046-more-homes), 5 Dec 2025.
<sup>[3]</sup> Arizona DCS, [Semi-Annual Child Welfare Report, March 2026](https://dcs.az.gov/content/semi-annual-child-welfare-report-mar-2026) — as of 31 Dec 2025.
