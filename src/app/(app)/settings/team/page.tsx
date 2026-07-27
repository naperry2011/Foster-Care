import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import SectionNote from "@/components/ui/SectionNote";
import InviteLink from "@/components/InviteLink";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { inviteTeammate, revokeInvite } from "./actions";

// The root layout's title template already appends " · Porchlight".
export const metadata = { title: "Your team" };

export default async function TeamPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("app_user").select("id, full_name, role, created_at").order("created_at"),
    supabase
      .from("agency_invite")
      .select("id, email, role, token, created_at, expires_at, accepted_at, revoked_at")
      .order("created_at", { ascending: false }),
  ]);

  const pending = (invites ?? []).filter(
    (i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date()
  );

  // NEXT_PUBLIC_APP_URL must be set per environment or the link a recruiter
  // copies out of here points at localhost — the same trap as the QR codes.
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/settings" className="text-sm text-sage hover:underline">
        ← Settings
      </Link>

      <div className="mt-3">
        <PageHeader
          eyebrow="nobody should be the only one who knows"
          title="Your team"
          description="Recruitment outlives any one recruiter. Everyone here sees the same contacts, the same waiting room and the same ledger."
        />
      </div>

      <Panel className="mt-8 p-6">
        <h2 className="font-display text-lg font-semibold">
          In {user.agencyName}
        </h2>
        <ul className="mt-3 divide-y divide-rule/60">
          {(members ?? []).map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">
                  {m.full_name?.trim() || "Unnamed"}
                  {m.id === user.id && (
                    <span className="text-muted font-normal"> · you</span>
                  )}
                </div>
                <div className="text-xs text-muted">joined {m.created_at.slice(0, 10)}</div>
              </div>
              <Pill tone={m.role === "director" ? "porch" : "quiet"}>{m.role}</Pill>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Invite someone</h2>
        <p className="text-sm text-muted mt-0.5">
          You&rsquo;ll get a link to send them. They have to sign in with this
          exact address — a forwarded link won&rsquo;t let anyone else in.
        </p>
        <form action={inviteTeammate} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] mt-4">
          <input
            name="email"
            type="email"
            required
            placeholder="colleague@agency.org"
            aria-label="Email address"
            className="rounded-xl border border-rule px-3 py-2 text-sm"
          />
          <select
            name="role"
            defaultValue="recruiter"
            aria-label="Role"
            className="rounded-xl border border-rule px-3 py-2 text-sm bg-white"
          >
            <option value="recruiter">Recruiter</option>
            <option value="director">Director</option>
          </select>
          <button className="rounded-full bg-porch text-night font-semibold px-5 py-2.5 text-sm hover:brightness-105">
            Create invite
          </button>
        </form>
      </Panel>

      {pending.length > 0 && (
        <div className="mt-6">
          <SectionNote>waiting to be accepted</SectionNote>
          <div className="mt-3 space-y-3">
            {pending.map((i) => (
              <Panel key={i.id} tone="butter" className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-medium">{i.email}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {i.role} · expires {i.expires_at.slice(0, 10)}
                    </div>
                  </div>
                  <form action={revokeInvite}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="text-xs text-muted underline hover:text-clay">
                      Revoke
                    </button>
                  </form>
                </div>
                <InviteLink url={`${base}/join/${i.token}`} />
              </Panel>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted mt-8 leading-relaxed">
        Porchlight doesn&rsquo;t email invitations yet — send the link yourself.
        Importing a contact list is deliberately not offered: a list with no
        record of how those people were reached is the one thing that would turn
        this into the kind of tool it exists to replace (ADR-004).
      </p>
    </main>
  );
}
