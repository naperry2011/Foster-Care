import Link from "next/link";
import Cited, { type Citation } from "@/components/ui/Cited";

// The three figures that carry the argument, with their provenance attached.
// These are hardcoded rather than read from az_stat: that table is readable by
// signed-in users only, and this page renders signed out — and renders at all
// when Supabase env vars are missing. Values and links are the same ones the
// README cites. See ADR-011 for why nothing here may render uncited.
const DCS_MONTHLY: Citation = {
  publisher: "Arizona DCS",
  title: "Monthly Operational & Outcomes Report, June 2026",
  url: "https://dcs.az.gov/content/monthly-operational-outcomes-report-june-2026",
  asOf: "Jun 2026",
};

const LANDING_STATS: { value: string; label: string; note?: string; source: Citation }[] = [
  {
    value: "61.9%",
    label: "fewer licensed foster homes than in 2017",
    note: "4,875 homes in SFY17. 1,859 in SFY25.",
    source: DCS_MONTHLY,
  },
  {
    value: "1,046",
    label: "more homes the state says it needs, within twelve months",
    source: {
      publisher: "Governor's Office via KJZZ",
      title:
        "Arizona just raised foster care pay rates by 50%. State still needs 1,046 more homes",
      url: "https://www.kjzz.org/politics/2025-12-05/arizona-just-raised-foster-care-pay-rates-by-50-state-still-needs-1-046-more-homes",
      asOf: "Dec 5, 2025",
    },
  },
  {
    value: "8,183",
    label: "children in out-of-home care today",
    source: {
      publisher: "Arizona DCS",
      title: "Semi-Annual Child Welfare Report, March 2026",
      url: "https://dcs.az.gov/content/semi-annual-child-welfare-report-mar-2026",
      asOf: "Dec 31, 2025",
    },
  },
];

// What a recruiter actually opens, on a real Tuesday.
const SCREENS = [
  {
    route: "/events",
    label: "the table you set up",
    title: "An event, and the code on it",
    body: "Make the fair before you go — what it cost, how many hours it will take. Print the QR code, tape it to the tablecloth. Everyone who scans it arrives stamped with that Saturday, permanently.",
  },
  {
    route: "/c/…",
    label: "ten seconds, standing up",
    title: "The one field they fill in",
    body: "A phone number or an email. That's the whole form. Name is optional and comes second, because asking for a name first makes it feel like paperwork — and paperwork is where you lose people.",
  },
  {
    route: "/board",
    label: "where everyone stands",
    title: "Five lanes, one glance",
    body: "Curious, considering, not yet, inquiry, licensed. Move someone and it's written into a history nobody can quietly edit later — including you.",
  },
  {
    route: "/contacts/…",
    label: "one person, whole",
    title: "Everything you ever said to them",
    body: "Every call you logged, every note the system sent, every stage they moved through, in one column. Two years from now a different recruiter reads it in fifteen seconds and picks up where you stopped.",
  },
  {
    route: "/tasks",
    label: "your first ten minutes",
    title: "What actually needs a human",
    body: "Wake-ups whose day has arrived. Families who wrote back — automation already stopped itself. People in “considering” who've heard nothing for thirty days. Clear it, and nobody slips.",
  },
  {
    route: "/ledger",
    label: "the board meeting page",
    title: "Which Saturdays became homes",
    body: "Every source: what it cost, who it captured, how many are still warm, how many became homes, and how many months it took. Prints on one page.",
  },
];

// The fence. Read the right-hand column as the reason, not the apology.
const BOUNDARIES = [
  {
    claim: "It hands off at the inquiry.",
    body: "Your licensing system stays the system of record. Porchlight never tries to become it.",
  },
  {
    claim: "It never touches child data.",
    body: "There is no table for it anywhere in the database. That's an absence, not a policy someone could change.",
  },
  {
    claim: "No home study. No case management.",
    body: "Binti and Casebook already do that, and do it well. We don't duplicate the parts that work.",
  },
  {
    claim: "No CSV import — on purpose.",
    body: "A thousand names with no record of how any of them were reached is the exact artefact this exists to replace. Homes you licensed before Porchlight can still be recorded, attributed to the source that produced them.",
  },
  {
    claim: "Nobody is emailed without consent.",
    body: "It's checked at the single path to the email provider, so there's no way to write around it — and one human reply pauses everything for that person.",
  },
  {
    claim: "Opting out is permanent.",
    body: "It can't be undone by anyone, including you. A person who leaves stays left.",
  },
  {
    claim: "Families never log in.",
    body: "The only two pages they ever see are a ten-second form and an unsubscribe page.",
  },
  {
    claim: "Your agency's data is walled off in the database.",
    body: "Not hidden in the interface — enforced in Postgres, and tested rather than assumed.",
  },
];

const FAQ = [
  {
    q: "Does this replace Binti or our licensing system?",
    a: "No, and it isn't trying to. Porchlight stops the moment a family inquires and hands them over. It owns the years before the application — the stretch your licensing system has never been able to see.",
  },
  {
    q: "Do we have to import our contact list?",
    a: "No — and Porchlight won't let you. A spreadsheet with no record of how anyone was reached would poison the one thing this exists to produce. You can record homes you licensed before Porchlight, attributed to the source that actually produced them.",
  },
  {
    q: "How long until we see licensed homes?",
    a: "Honestly: twelve to twenty-four months, because that's how long licensure lags a first conversation. Month two gives you captures and warm relationships, not homes. Judge the first year on how many people you're holding warm — those are the homes, early.",
  },
  {
    q: "What happens when someone asks to be deleted?",
    a: "One recorded path erases them completely — contact, conversations, stage history, everything queued. It keeps the event and what it cost, so your ledger stays honest afterwards rather than quietly improving every time someone leaves.",
  },
  {
    q: "Can another agency see our contacts?",
    a: "No. Every table is scoped to your agency in the database itself, and a standing audit checks what a stranger holding the public key can actually reach. It has caught two real holes that nothing else would have.",
  },
  {
    q: "Who on our team can see what?",
    a: "Everyone in your agency sees the same contacts, the same waiting room and the same ledger. “Director” and “recruiter” are labels, not access levels — worth knowing before you roll it out. Nobody can change their own role or move themselves into another agency.",
  },
  {
    q: "What do we need to get started?",
    a: "A recruiter, one real event, and ten minutes a day. Signing in is a magic link — there are no passwords to forget or share. Nurture email needs an email provider connected; everything else works without one.",
  },
  {
    q: "Is this only for Arizona?",
    a: "Today, yes, deliberately. The statistics are Arizona's and the onboarding checklist encodes Arizona's nine licensing requirements. Nothing in the design is Arizona-only, but nothing else has been built or verified yet, and we'd rather say so.",
  },
];

const STAGES = [
  {
    num: "1",
    name: "Unaware",
    body: "They're in a pew, a break room, a neighborhood group. Fostering hasn't crossed their mind — yet. We remember the places you showed up.",
    owned: true,
  },
  {
    num: "2",
    name: "Curious",
    body: "They stopped at your table for two minutes. One QR code, one field, ten seconds — and they're no longer a stranger you'll never see again.",
    owned: true,
  },
  {
    num: "3",
    name: "Considering",
    body: "Am I eligible? Can I afford it? We answer the questions people are too shy to ask out loud, gently, one at a time.",
    owned: true,
  },
  {
    num: "4",
    name: "Not yet",
    body: "“Ask me in two years.” That's not a no — it's a promise. We set a wake-up date and keep the porch light on until they're ready.",
    owned: true,
  },
  {
    num: "5",
    name: "Inquiry",
    body: "They raise their hand. We note where their story truly began and hand them warmly to your licensing team.",
    owned: false,
  },
  {
    num: "6",
    name: "Licensed",
    body: "A few months later, a child has a home. And you can trace it all the way back to that Saturday at the fair.",
    owned: false,
  },
];

const PATCHES = [
  {
    label: "Capture",
    title: "Ten seconds, standing up",
    body: "A QR code made on your phone in the parking lot. One field. Every person remembered, along with where you met them.",
    bg: "bg-butter",
    accent: "text-clay",
    tilt: "-rotate-1",
  },
  {
    label: "The waiting room",
    title: "“Not yet” gets a comfy chair",
    body: "Other tools throw “not yet” in the trash. We give it a wake-up date and a quiet quarterly hello — warmth, never pressure.",
    bg: "bg-sage-tint",
    accent: "text-sage",
    tilt: "rotate-1",
  },
  {
    label: "Nurture",
    title: "Answers before they ask",
    body: "What does it cost? Do I qualify? A week in the life. Honest answers arrive right on time — and a human reply always pauses the machine.",
    bg: "bg-clay-tint",
    accent: "text-clay",
    tilt: "rotate-[0.5deg]",
  },
  {
    label: "Ambassadors",
    title: "Families invite families",
    body: "Your current foster parents are your warmest storytellers. Each gets a personal link, and every family they inspire is counted.",
    bg: "bg-sage-tint",
    accent: "text-sage",
    tilt: "-rotate-[0.5deg]",
  },
  {
    label: "The ledger",
    title: "Proof for the people who fund you",
    body: "Which Saturdays became homes? Cost per licensed home, by source, over years — one page your director can hold up in any board meeting.",
    bg: "bg-butter",
    accent: "text-clay",
    tilt: "rotate-1",
  },
];

function HouseScene() {
  return (
    <svg
      viewBox="0 0 900 420"
      className="w-full max-w-3xl mx-auto block"
      aria-hidden="true"
    >
      {/* stars */}
      {[
        [60, 40], [150, 90], [260, 30], [370, 70], [520, 25],
        [640, 80], [750, 45], [840, 100], [200, 140], [700, 140],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 2.2 : 1.4}
          fill="#FBE3B4"
          className="star"
          style={{ animationDelay: `${i * 0.7}s` }}
        />
      ))}
      {/* moon */}
      <circle cx="790" cy="70" r="26" fill="#FBE3B4" opacity="0.9" />
      <circle cx="780" cy="62" r="26" fill="#2B2140" />

      {/* hill */}
      <ellipse cx="450" cy="470" rx="560" ry="130" fill="#241a38" />

      {/* porch light halo */}
      <circle cx="450" cy="235" r="120" fill="url(#halo)" className="porch-glow" />

      {/* house */}
      <g>
        {/* chimney */}
        <rect x="540" y="140" width="30" height="70" rx="3" fill="#332648" />
        {/* body */}
        <rect x="330" y="200" width="240" height="150" rx="6" fill="#3a2b52" />
        {/* roof */}
        <path d="M310 205 L450 110 L590 205 Z" fill="#2b2044" />
        <path d="M310 205 L450 110 L590 205" fill="none" stroke="#e9a23b" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
        {/* door */}
        <rect x="425" y="265" width="50" height="85" rx="24" fill="#e9a23b" opacity="0.95" />
        <rect x="431" y="272" width="38" height="72" rx="19" fill="#fbe3b4" opacity="0.9" />
        <circle cx="462" cy="312" r="3" fill="#3a2b52" />
        {/* windows */}
        <rect x="352" y="235" width="44" height="44" rx="6" fill="#fbe3b4" opacity="0.92" />
        <path d="M374 235 v44 M352 257 h44" stroke="#3a2b52" strokeWidth="3" />
        <rect x="504" y="235" width="44" height="44" rx="6" fill="#fbe3b4" opacity="0.92" />
        <path d="M526 235 v44 M504 257 h44" stroke="#3a2b52" strokeWidth="3" />
        {/* attic window */}
        <circle cx="450" cy="165" r="16" fill="#fbe3b4" opacity="0.9" />
        <path d="M450 149 v32 M434 165 h32" stroke="#2b2044" strokeWidth="3" />
        {/* porch lamp */}
        <line x1="450" y1="200" x2="450" y2="214" stroke="#e9a23b" strokeWidth="3" />
        <circle cx="450" cy="222" r="8" fill="#fff8ea" className="porch-glow" />
      </g>

      {/* fireflies */}
      {[
        [250, 320], [640, 300], [180, 260], [720, 250], [560, 350], [340, 370],
      ].map(([x, y], i) => (
        <circle
          key={`f${i}`}
          cx={x}
          cy={y}
          r="3"
          fill="#FBE3B4"
          className="firefly"
          style={{ animationDelay: `${i * 1.6}s` }}
        />
      ))}

      <defs>
        <radialGradient id="halo">
          <stop offset="0%" stopColor="#e9a23b" stopOpacity="0.5" />
          <stop offset="55%" stopColor="#e9a23b" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#e9a23b" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="flex-1 bg-paper text-ink">
      {/* ============ HERO ============ */}
      <header className="relative overflow-hidden bg-gradient-to-b from-night via-plum to-plum-2 text-white">
        <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-porch shadow-[0_0_18px_5px_rgba(233,162,59,.6)]" />
            <span className="font-display text-2xl font-semibold">Porchlight</span>
          </div>
          {/* The page is long. Give people a way down it that isn't scrolling. */}
          <div className="hidden sm:flex items-center gap-7 font-hand text-xl text-glow/75">
            <a href="#path" className="hover:text-white transition">
              how it works
            </a>
            <a href="#inside" className="hover:text-white transition">
              inside the app
            </a>
            <a href="#questions" className="hover:text-white transition">
              questions
            </a>
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold rounded-full bg-glow/95 text-plum px-5 py-2.5 hover:bg-white transition"
          >
            Come on in
          </Link>
        </nav>

        <div className="relative max-w-4xl mx-auto px-6 pt-10 sm:pt-16 text-center">
          <p className="rise font-hand text-2xl text-glow/90" style={{ animationDelay: "0.1s" }}>
            for the people who find foster families
          </p>
          <h1
            className="rise font-display font-semibold text-[2.6rem] leading-[1.08] sm:text-6xl mt-4 tracking-tight"
            style={{ animationDelay: "0.25s" }}
          >
            Every child&apos;s story starts
            <br />
            with a light <em className="text-glow not-italic font-display italic">left on.</em>
          </h1>
          <p
            className="rise mt-6 text-lg text-white/75 max-w-xl mx-auto leading-relaxed"
            style={{ animationDelay: "0.4s" }}
          >
            The mom at the church fair who said <em>“maybe someday.”</em> The
            coworker who asked one quiet question and never brought it up again.
            Porchlight remembers them, stays gently in touch for years, and
            welcomes them back the day they&apos;re ready.
          </p>
          <div
            className="rise mt-8 flex flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: "0.55s" }}
          >
            <Link
              href="/login"
              className="rounded-full bg-porch text-night font-bold px-8 py-4 text-lg hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(233,162,59,.7)] transition"
            >
              Pilot it with your agency
            </Link>
            <a
              href="#path"
              className="font-hand text-2xl text-glow underline decoration-wavy decoration-1 underline-offset-4 hover:text-white transition"
            >
              see how it works ↓
            </a>
          </div>
        </div>

        <div className="rise relative mt-6 -mb-1" style={{ animationDelay: "0.7s" }}>
          <HouseScene />
        </div>
      </header>

      {/* ============ THE NOTE ============ */}
      <section className="py-20 sm:py-24 relative">
        <div className="max-w-4xl mx-auto px-6 grid gap-12 md:grid-cols-[1fr_1.1fr] items-center">
          <div className="relative mx-auto w-full max-w-sm rotate-[-2deg]">
            {/* tape */}
            <span className="absolute -top-3 left-10 w-20 h-6 bg-glow/70 rotate-[-6deg] rounded-sm shadow-sm" />
            <span className="absolute -top-2 right-8 w-16 h-6 bg-glow/70 rotate-[8deg] rounded-sm shadow-sm" />
            <div className="bg-butter rounded-lg shadow-[0_18px_40px_-18px_rgba(60,47,42,.35)] border border-rule p-8">
              <p className="font-hand text-3xl leading-snug text-ink">
                “We talk to forty people at a fair. By Monday…
                <span className="text-clay"> all forty are gone.</span> We
                don&apos;t know how to capture that.”
              </p>
              <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted font-semibold">
                — recruitment lead, Arizona licensing agency
              </p>
            </div>
          </div>
          <div>
            <p className="font-hand text-2xl text-clay">the problem, plainly</p>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl mt-2 leading-tight">
              Arizona lost 62% of its foster homes. The families who could
              replace them keep slipping away unnoticed.
            </h2>
            <p className="mt-5 leading-relaxed text-[17px]">
              Every system in child welfare wakes up when someone fills out an
              application. But families don&apos;t begin at a form — they begin
              at a table, a conversation, a <em>maybe when my youngest is
              older</em>. Porchlight is the first tool built for that tender,
              years-long in-between.
            </p>
          </div>
        </div>

        {/* Every figure carries its publisher, its link and its date — the same
            rule the app enforces on itself. A number you can't source is a
            number a director can't repeat to a board. */}
        <div className="max-w-4xl mx-auto px-6 mt-14">
          <div className="grid gap-4 sm:grid-cols-3">
            {LANDING_STATS.map((s) => (
              <Cited
                key={s.label}
                value={s.value}
                label={s.label}
                note={s.note}
                source={s.source}
              />
            ))}
          </div>
          <p className="mt-4 font-hand text-xl text-muted text-center">
            every number on this page says where it came from ♥
          </p>
        </div>
      </section>

      {/* ============ THE PATH HOME ============ */}
      <section id="path" className="bg-paper-2 py-20 sm:py-24 relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="font-hand text-2xl text-sage">six little steps</p>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl mt-2">
            The path home
          </h2>
          <p className="mt-4 text-muted max-w-xl mx-auto">
            Every other tool only sees the last two steps. Porchlight walks the
            whole path — especially the slow, quiet parts.
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-6 mt-14 relative">
          {/* the winding dashed path */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-[3px] border-dashed border-clay/40" />
          <div className="space-y-10">
            {STAGES.map((s, i) => (
              <div
                key={s.num}
                className={`relative flex ${i % 2 ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative w-[calc(50%-2.2rem)] rounded-2xl border p-6 shadow-[0_14px_30px_-18px_rgba(60,47,42,.35)] ${
                    s.owned
                      ? "bg-white border-rule"
                      : "bg-paper border-rule/60 opacity-80"
                  } ${i % 2 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"}`}
                >
                  <h3 className="font-display font-semibold text-xl">{s.name}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
                    {s.body}
                  </p>
                  {s.owned && (
                    <span className="mt-3 inline-block font-hand text-lg text-clay">
                      Porchlight&apos;s job ♥
                    </span>
                  )}
                </div>
                {/* stepping stone */}
                <span
                  className={`absolute left-1/2 top-6 -translate-x-1/2 w-11 h-11 rounded-full grid place-items-center font-display font-bold text-lg border-[3px] ${
                    s.owned
                      ? "bg-porch text-night border-glow shadow-[0_0_24px_rgba(233,162,59,.5)]"
                      : "bg-paper-2 text-muted border-rule"
                  }`}
                >
                  {s.num}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center mt-12 font-hand text-2xl text-ink/70 max-w-md mx-auto">
            Steps 1–4 aren&apos;t a sales funnel. They&apos;re a{" "}
            <span className="text-clay">waiting room measured in years</span> —
            and we keep it warm.
          </p>
        </div>
      </section>

      {/* ============ QUILT ============ */}
      <section className="py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center">
            <p className="font-hand text-2xl text-clay">what&apos;s inside</p>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl mt-2">
              Five patches, one quilt
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PATCHES.map((p, i) => (
              <div
                key={p.label}
                className={`${p.bg} ${p.tilt} ${
                  i === PATCHES.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
                } rounded-2xl p-7 border-2 border-dashed border-ink/15 shadow-[0_16px_34px_-20px_rgba(60,47,42,.4)] hover:rotate-0 hover:-translate-y-1 transition-transform`}
              >
                <p className={`font-hand text-2xl ${p.accent}`}>{p.label}</p>
                <h3 className="font-display font-semibold text-xl mt-1.5">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink/80">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHAT YOU ACTUALLY DO IN IT ============ */}
      <section id="inside" className="bg-paper-2 py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center">
            <p className="font-hand text-2xl text-sage">a real Tuesday</p>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl mt-2">
              What you actually do in it
            </h2>
            <p className="mt-4 text-muted max-w-xl mx-auto">
              Six screens. Ten minutes a morning. Nothing here needs training
              wheels or a consultant.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SCREENS.map((s) => (
              <div
                key={s.route}
                className="rounded-2xl border border-rule bg-white p-6 flex flex-col shadow-[0_14px_30px_-22px_rgba(60,47,42,.4)]"
              >
                <p className="font-hand text-xl text-clay">{s.label}</p>
                <h3 className="font-display font-semibold text-xl mt-1">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink/80 flex-1">
                  {s.body}
                </p>
                <span className="mt-4 self-start rounded-full bg-paper-2 border border-rule px-3 py-1 text-[12px] tracking-[0.06em] text-muted">
                  {s.route}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 font-hand text-2xl text-ink/70 max-w-lg mx-auto">
            The nightly part runs itself. The phone call is still yours —{" "}
            <span className="text-clay">that was always the point.</span>
          </p>
        </div>
      </section>

      {/* ============ PROOF ============ */}
      <section className="bg-sage-tint py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <p className="font-hand text-2xl text-sage">worth a Saturday?</p>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl mt-2 max-w-2xl mx-auto">
              Finally see which of your Saturdays became somebody&apos;s home.
            </h2>
          </div>

          <div className="mt-10 bg-white rounded-2xl border border-rule shadow-[0_24px_50px_-30px_rgba(60,47,42,.45)] overflow-hidden rotate-[-0.4deg]">
            <div className="px-6 py-4 border-b border-rule flex items-center justify-between flex-wrap gap-2">
              <span className="font-display font-semibold text-lg">
                What produced our homes
              </span>
              <span className="font-hand text-xl text-muted">sample data</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted border-b border-rule">
                    <th className="px-6 py-3 font-semibold">Where we showed up</th>
                    <th className="px-6 py-3 font-semibold text-right">People met</th>
                    <th className="px-6 py-3 font-semibold text-right">Homes</th>
                    <th className="px-6 py-3 font-semibold text-right">Cost / home</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Foster families inviting friends", "62", "9", "$0 + 3 hrs", true],
                    ["Church & community fairs", "318", "17", "$140", true],
                    ["“Not yet” folks who came back", "86", "6", "$12", true],
                    ["Paid social ads", "441", "2", "$4,700", false],
                    ["Radio campaign", "73", "0", "∞", false],
                  ].map(([src, cap, lic, cost, win]) => (
                    <tr key={src as string} className="border-b border-rule/50 last:border-0">
                      <td className="px-6 py-4 font-semibold">{src}</td>
                      <td className="px-6 py-4 text-right text-muted">{cap}</td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${
                          win ? "text-sage" : "text-clay"
                        }`}
                      >
                        {lic}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          win ? "text-sage" : "text-clay"
                        }`}
                      >
                        {cost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-5 bg-butter text-[15px] border-t border-rule">
              <span className="font-hand text-2xl text-clay mr-2">six homes</span>
              came from people who had already said no. Without a waiting room,
              every one of them would have been lost.
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHERE PORCHLIGHT STOPS ============ */}
      <section id="stops" className="py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <p className="font-hand text-2xl text-clay">the fence, out loud</p>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl mt-2">
              Where Porchlight stops
            </h2>
            <p className="mt-4 text-muted max-w-xl mx-auto">
              A short tool that knows its edges is worth more than a long one
              that doesn&apos;t. Most of these are enforced in the database, not
              promised in a manual.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border-2 border-dashed border-ink/15 bg-butter p-7 sm:p-9">
            <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {BOUNDARIES.map((b) => (
                <li key={b.claim}>
                  <p className="font-display font-semibold text-[17px] leading-snug">
                    {b.claim}
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink/75">
                    {b.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ QUESTIONS ============ */}
      <section id="questions" className="bg-paper-2 py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <p className="font-hand text-2xl text-sage">
              what directors ask first
            </p>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl mt-2">
              Straight answers
            </h2>
          </div>

          <dl className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-display font-semibold text-lg leading-snug">
                  {f.q}
                </dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-ink/80">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-plum-2 via-plum to-night text-white text-center py-24">
        <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[540px] h-[380px] rounded-full bg-[radial-gradient(circle,rgba(233,162,59,.18),transparent_65%)]" />
        {[
          [80, 60], [200, 120], [1080, 90], [1180, 150], [980, 50],
        ].map(([x, y], i) => (
          <span
            key={i}
            className="star absolute w-1 h-1 rounded-full bg-glow"
            style={{ left: x, top: y, animationDelay: `${i * 0.8}s` }}
          />
        ))}
        <div className="relative max-w-2xl mx-auto px-6">
          <p className="font-hand text-3xl text-glow">
            now welcoming one design partner
          </p>
          <h2 className="font-display font-semibold text-4xl sm:text-5xl mt-4 leading-tight">
            Somebody told you <em className="italic text-glow">“not yet”</em>{" "}
            this year.
            <br />
            Let&apos;s keep the light on for them.
          </h2>
          <p className="mt-6 text-white/70 max-w-lg mx-auto leading-relaxed">
            One Arizona agency, one recruiter, one real event — thirty people
            who would otherwise have evaporated. That&apos;s the whole pilot.
          </p>
          <Link
            href="/login"
            className="inline-block mt-9 rounded-full bg-porch text-night font-bold px-9 py-4 text-lg hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(233,162,59,.7)] transition"
          >
            Start the conversation
          </Link>
        </div>
      </section>

      <footer className="bg-night text-white/40 py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-porch" />
            Porchlight · Phoenix, AZ
          </span>
          <span className="font-hand text-xl text-glow/60">
            made with the light on ♥
          </span>
        </div>
      </footer>
    </div>
  );
}
