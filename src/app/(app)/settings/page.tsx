import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { updateAgency } from "./actions";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <p className="font-hand text-2xl text-clay">your porch</p>
      <h1 className="font-display text-3xl font-semibold mt-1">Agency settings</h1>

      <form
        action={updateAgency}
        className="mt-8 rounded-2xl border border-rule bg-white p-6 space-y-5"
      >
        <label className="block">
          <span className="text-sm font-semibold">Agency name</span>
          <input
            name="agency_name"
            defaultValue={user.agencyName}
            required
            className="mt-1.5 w-full rounded-md border border-rule px-4 py-3"
          />
          <span className="text-xs text-muted">
            Shown on your capture pages and board-ready exports.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Your name</span>
          <input
            name="full_name"
            defaultValue={user.fullName ?? ""}
            placeholder="How your teammates see you"
            className="mt-1.5 w-full rounded-md border border-rule px-4 py-3"
          />
        </label>

        <div className="text-sm text-muted border-t border-rule pt-4">
          Signed in as <span className="text-ink">{user.email}</span> · role{" "}
          <span className="text-ink">{user.role}</span>
        </div>

        <button className="rounded-full bg-porch text-night font-semibold px-7 py-3 hover:brightness-105">
          Save changes
        </button>
      </form>

      <Link
        href="/settings/team"
        className="mt-4 block rounded-2xl border border-rule bg-white p-6 hover:border-porch transition-colors"
      >
        <span className="font-display font-semibold">Your team →</span>
        <span className="block text-sm text-muted mt-1">
          Invite colleagues so recruitment outlives any one recruiter.
        </span>
      </Link>
    </main>
  );
}
