"use client";

import { useState } from "react";
import Link from "next/link";
import { addContact } from "@/app/(app)/contacts/actions";
import { SOURCE_KINDS, SOURCE_KIND_LABELS } from "@/lib/stages";

export type SourceOption = {
  id: string;
  name: string;
  kind: string;
};

const FIELD =
  "w-full rounded-md border border-rule px-4 py-3 text-base focus:outline-none focus:border-porch";

export default function AddContactForm({
  sources,
  error,
}: {
  sources: SourceOption[];
  error?: string;
}) {
  // Default to the most recent source when there is one, because the common
  // case is "I just met somebody at the event I set up this morning".
  const [sourceId, setSourceId] = useState(
    sources.length ? sources[0].id : "__new__"
  );
  const creatingSource = sourceId === "__new__";

  return (
    <form action={addContact} className="mt-8 space-y-6">
      {error && (
        <p className="rounded-xl border border-clay/40 bg-clay-tint px-4 py-3 text-sm">
          {error === "reachable"
            ? "Add a phone number or an email — one of the two is enough, but we need a way to reach them."
            : error === "source_name"
              ? "Give the new source a name."
              : "Choose where you met this person."}
        </p>
      )}

      <div className="rounded-2xl border border-rule bg-white p-5 space-y-3">
        <div>
          <label
            htmlFor="source_id"
            className="block text-sm font-medium mb-1.5"
          >
            Where did you meet?
          </label>
          <p className="text-xs text-muted mb-2">
            This is stamped on permanently and can never be changed. It&apos;s
            what lets the ledger trace a licensed home back to the Saturday it
            started.
          </p>
          <select
            id="source_id"
            name="source_id"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className={`${FIELD} bg-white`}
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__new__">＋ A new source…</option>
          </select>
        </div>

        {creatingSource && (
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <input
              name="new_source_name"
              required
              placeholder="Name it (e.g. Walk-in, Grace Community fair)"
              className={`${FIELD} sm:col-span-2`}
            />
            <select
              name="new_source_kind"
              defaultValue="walk_in"
              className={`${FIELD} bg-white sm:col-span-2`}
            >
              {SOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SOURCE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <p className="sm:col-span-2 text-xs text-muted">
              This creates a source you can add a cost and a QR code to later,
              over on{" "}
              <Link href="/events" className="text-sage underline">
                Sources &amp; events
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-rule bg-white p-5 space-y-3">
        <p className="text-sm font-medium">How do you reach them?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Phone"
            className={FIELD}
          />
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            className={FIELD}
          />
        </div>
        <p className="text-xs text-muted">Either one is enough.</p>

        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <input
            name="first_name"
            autoComplete="given-name"
            placeholder="First name (optional)"
            className={FIELD}
          />
          <input
            name="last_name"
            autoComplete="family-name"
            placeholder="Last name (optional)"
            className={FIELD}
          />
        </div>

        <textarea
          name="notes"
          rows={3}
          placeholder="Anything worth remembering (optional)"
          className={FIELD}
        />

        <label className="flex items-start gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name="consent"
            defaultChecked
            className="mt-1"
          />
          They said it&apos;s OK to follow up. Without this, nothing automated
          is ever sent to them.
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-porch text-night font-semibold px-6 py-3.5 text-base hover:brightness-105"
        >
          Add contact
        </button>
        <Link href="/contacts" className="text-sm text-muted px-2 py-3">
          Cancel
        </Link>
      </div>
    </form>
  );
}
