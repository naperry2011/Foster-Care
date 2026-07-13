import Link from "next/link";

const STAGES = [
  {
    num: "01",
    name: "Unaware",
    tag: "No record exists",
    body: "They're in a pew, a break room, a neighborhood group. Porchlight tracks the channel, so when someone surfaces you can trace them back.",
    owned: true,
  },
  {
    num: "02",
    name: "Curious",
    tag: "Anonymous → known",
    body: "They took a flyer, stood at your table for two minutes. Ten-second capture: a QR code, one field. Name optional.",
    owned: true,
  },
  {
    num: "03",
    name: "Considering",
    tag: "Quietly self-qualifying",
    body: "Am I eligible? Can I afford it? Porchlight answers the questions they're too embarrassed to ask — in exchange for permission to follow up.",
    owned: true,
  },
  {
    num: "04",
    name: "Not yet",
    tag: "The graveyard",
    body: "“Ask me in two years.” A wake-up date, a quiet quarterly touch, and a system that shows up on the day they're ready.",
    owned: true,
  },
  {
    num: "05",
    name: "Inquiry",
    tag: "Where everyone else starts",
    body: "They raise their hand. Porchlight stamps the inquiry with its true origin and hands it to your licensing system.",
    owned: false,
  },
  {
    num: "06",
    name: "Licensed",
    tag: "The only number that counts",
    body: "Three to six months later, a home exists. Porchlight writes that outcome back against the original source.",
    owned: false,
  },
];

const MODULES = [
  {
    num: "01 / Capture",
    title: "Ten seconds, standing up",
    body: "Per-event QR codes made on a phone. One field — phone or email. Every contact stamped with its source. No orphans, ever.",
  },
  {
    num: "02 / Waiting room",
    title: "“Not yet” is a status, not a rejection",
    body: "A wake-up date on every held contact, quarterly warmth instead of weekly harassment, and automatic re-engagement when the date arrives.",
  },
  {
    num: "03 / Nurture",
    title: "Two recruiters, a thousand warm contacts",
    body: "Stage-triggered email that answers the questions people ask themselves privately. A human reply pauses the machine — every time.",
  },
  {
    num: "04 / Ambassadors",
    title: "Your best recruiters already foster",
    body: "A personal share link per foster parent. Referral chains tracked all the way to the licensed home.",
  },
  {
    num: "05 / The ledger",
    title: "The screen she shows her executive director",
    body: "Cost per licensed home, by source, across the full lag window — the one question your funding actually depends on.",
  },
];

export default function Landing() {
  return (
    <div className="flex-1 bg-paper text-ink">
      {/* ============ NAV ============ */}
      <nav className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-7 py-5">
        <div className="flex items-center gap-2.5 text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-porch shadow-[0_0_18px_4px_rgba(233,162,59,.55)]" />
          <span className="font-semibold text-xl">Porchlight</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium rounded-full bg-porch text-night px-5 py-2 hover:brightness-105"
        >
          Sign in
        </Link>
      </nav>

      {/* ============ HERO ============ */}
      <header className="relative overflow-hidden bg-dusk text-white">
        {/* porch light */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[2px] h-16 bg-gradient-to-b from-porch/10 to-porch/60" />
        <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 w-6 h-6 rounded-full bg-[radial-gradient(circle_at_42%_38%,#FFF8EA_0%,#FBE3B4_42%,#E9A23B_100%)] shadow-[0_0_40px_12px_rgba(233,162,59,.45),0_0_120px_40px_rgba(233,162,59,.18)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_420px_at_50%_30%,rgba(251,227,180,.16),rgba(233,162,59,.06)_55%,transparent_75%)]" />

        <div className="relative max-w-5xl mx-auto px-7 pt-36 pb-24 text-center">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-porch">
            Foster parent recruitment · Arizona
          </p>
          <h1 className="mt-6 text-4xl sm:text-6xl font-semibold leading-[1.05] tracking-tight max-w-3xl mx-auto">
            The families you never knew{" "}
            <span className="text-glow">were interested.</span>
          </h1>
          <p className="mt-6 text-lg text-[#C3BFD2] max-w-2xl mx-auto leading-relaxed">
            Every recruitment tool starts when someone fills out a form.
            Porchlight starts three years earlier — at the church fair, the
            break-room conversation, the person who said{" "}
            <em>maybe when my youngest is older</em> and then vanished forever.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-porch text-night font-medium px-7 py-3.5 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-8px_rgba(233,162,59,.65)] transition"
            >
              Pilot it with your agency
            </Link>
            <a
              href="#funnel"
              className="rounded-full border border-white/25 text-[#DED9EC] px-7 py-3.5 hover:bg-white/5 transition"
            >
              See what&apos;s being lost
            </a>
          </div>
        </div>
      </header>

      {/* ============ THE GAP ============ */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-7">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-porch">
            The gap
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">
            Arizona lost 62% of its licensed foster homes. Every agency is
            fighting for them with a spreadsheet.
          </h2>
          <blockquote className="my-10 border-l-[3px] border-porch pl-7 py-4 text-2xl italic max-w-lg leading-snug">
            We don&apos;t know how to capture that.
            <span className="block not-italic font-mono text-[11px] tracking-[0.14em] uppercase text-muted mt-4">
              Recruitment lead · Arizona licensing agency
            </span>
          </blockquote>
          <div className="grid gap-10 md:grid-cols-2 text-[15.5px] leading-relaxed">
            <p>
              She stands at a table at a church fair and talks to forty people.
              Six are genuinely interested. Two say{" "}
              <em>maybe in a couple of years</em>. By Monday, all forty are
              gone. No record. No follow-up. No way to know whether that
              Saturday was worth it.
            </p>
            <p>
              <strong>
                Binti, Casebook, and the state&apos;s own systems all wake up at
                the application.
              </strong>{" "}
              Porchlight is the layer that sits in front — it turns a two-minute
              conversation into a durable record, keeps it warm for years, and
              traces every licensed home back to the moment it started.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FUNNEL ============ */}
      <section id="funnel" className="bg-dusk text-[#DAD6E6] py-20">
        <div className="max-w-5xl mx-auto px-7">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-porch">
            The funnel before the funnel
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-white max-w-2xl">
            Six stages. Every other tool can only see the last two.
          </h2>
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {STAGES.map((s) => (
              <div
                key={s.num}
                className="grid sm:grid-cols-[64px_1.1fr_1.6fr] gap-4 sm:gap-6 py-6"
              >
                <div
                  className={`font-mono text-xs pt-1 ${
                    s.owned ? "text-porch" : "text-[#5C5775]"
                  }`}
                >
                  {s.num}
                </div>
                <div>
                  <div
                    className={`text-xl font-semibold ${
                      s.owned ? "text-white" : "text-[#8B8699]"
                    }`}
                  >
                    {s.name}
                  </div>
                  <div
                    className={`font-mono text-[10.5px] tracking-[0.12em] uppercase mt-1.5 ${
                      s.owned ? "text-porch" : "text-[#5C5775]"
                    }`}
                  >
                    {s.tag}
                  </div>
                </div>
                <p
                  className={`text-[15px] leading-relaxed ${
                    s.owned ? "text-[#C3BFD2]" : "text-[#7E798F]"
                  }`}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-md border-l-[3px] border-porch bg-porch/10 px-7 py-6 text-[16px] leading-relaxed max-w-3xl">
            Stages 01–04 aren&apos;t a &ldquo;top of funnel.&rdquo; They&apos;re
            a <strong className="text-white">waiting room measured in years</strong>.
            A normal CRM discards the people who won&apos;t move.{" "}
            <strong className="text-white">
              This one is built to hold people gently for a very long time.
            </strong>
          </div>
        </div>
      </section>

      {/* ============ MODULES ============ */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-7">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-porch">
            What it does
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">
            Five things. Nothing else until these work.
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 gap-px bg-rule border border-rule">
            {MODULES.map((m, i) => (
              <div
                key={m.num}
                className={`p-7 ${
                  i === MODULES.length - 1
                    ? "sm:col-span-2 bg-sage-tint"
                    : "bg-paper hover:bg-white transition-colors"
                }`}
              >
                <div
                  className={`font-mono text-[11px] tracking-[0.14em] ${
                    i === MODULES.length - 1 ? "text-sage" : "text-porch"
                  }`}
                >
                  {m.num}
                </div>
                <h3 className="mt-3 text-xl font-semibold">{m.title}</h3>
                <p className="mt-2 text-[15px] text-[#4C4956] leading-relaxed">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROOF ============ */}
      <section className="bg-paper-2 py-20">
        <div className="max-w-5xl mx-auto px-7">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-porch">
            The proof
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">
            No agency in Arizona can currently produce this table.
          </h2>
          <div className="mt-10 rounded-lg border border-rule bg-white overflow-hidden shadow-[0_30px_60px_-40px_rgba(35,33,43,.35)]">
            <div className="px-6 py-4 border-b border-rule flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold">Cost per licensed home, by source</span>
              <span className="font-mono text-[11px] text-muted">
                TRAILING 18 MONTHS · SAMPLE DATA
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-[10px] tracking-[0.14em] uppercase text-muted border-b border-rule">
                    <th className="px-6 py-3 font-medium">Source</th>
                    <th className="px-6 py-3 font-medium text-right">Captured</th>
                    <th className="px-6 py-3 font-medium text-right">Licensed</th>
                    <th className="px-6 py-3 font-medium text-right">Cost / home</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Ambassador referrals", "62", "9", "$0 + 3 hrs", true],
                    ["Church & community fairs", "318", "17", "$140", true],
                    ["Waiting room re-engagement", "—", "6", "$12", true],
                    ["Paid social", "441", "2", "$4,700", false],
                    ["Radio campaign", "73", "0", "∞", false],
                  ].map(([src, cap, lic, cost, win]) => (
                    <tr key={src as string} className="border-b border-rule/60 last:border-0">
                      <td className="px-6 py-4 font-medium">{src}</td>
                      <td className="px-6 py-4 text-right font-mono">{cap}</td>
                      <td
                        className={`px-6 py-4 text-right font-mono font-semibold ${
                          win ? "text-sage" : "text-clay"
                        }`}
                      >
                        {lic}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-mono ${
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
            <div className="px-6 py-5 bg-sage-tint text-[#2F5347] text-[15px] border-t border-[#D8E4DF]">
              <strong>
                Six of this agency&apos;s 34 licensed homes came from people who
                had already said no.
              </strong>{" "}
              Without a waiting room, all six would have been lost.
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative overflow-hidden bg-night text-white text-center py-24">
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(233,162,59,.16),transparent_68%)]" />
        <div className="relative max-w-3xl mx-auto px-7">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-porch">
            Now taking one design partner
          </p>
          <h2 className="mt-5 text-3xl sm:text-5xl font-semibold tracking-tight">
            Somebody told you <em>not yet</em> this year. Where did they go?
          </h2>
          <p className="mt-6 text-[#9A95AD] max-w-xl mx-auto">
            We&apos;re looking for one Arizona licensing agency to pilot
            Porchlight on a single real event — one recruiter, one QR code,
            thirty real people who would otherwise have evaporated.
          </p>
          <Link
            href="/login"
            className="inline-block mt-9 rounded-full bg-porch text-night font-medium px-8 py-3.5 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-8px_rgba(233,162,59,.65)] transition"
          >
            Start the conversation
          </Link>
        </div>
      </section>

      <footer className="bg-night border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-7 flex justify-between flex-wrap gap-3 font-mono text-[11px] tracking-wide text-[#5C5775]">
          <span>PORCHLIGHT · MVP</span>
          <span>PHOENIX, AZ</span>
        </div>
      </footer>
    </div>
  );
}
