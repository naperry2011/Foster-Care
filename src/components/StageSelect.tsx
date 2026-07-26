"use client";

import { useRef, useState, useTransition } from "react";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";
import { moveStage } from "@/app/contacts/actions";

function oneYearOut() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function StageSelect({
  contactId,
  stage,
}: {
  contactId: string;
  stage: Stage;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  // Moving into the waiting room asks for the wake-up date inline. It is never
  // a dismissible dialog: a held contact without a date is a forgotten person.
  const [askingWakeUp, setAskingWakeUp] = useState(false);
  const [selected, setSelected] = useState<Stage>(stage);

  const submit = () => startTransition(() => formRef.current?.requestSubmit());

  return (
    <form ref={formRef} action={moveStage} className="space-y-2">
      <input type="hidden" name="contact_id" value={contactId} />
      <select
        name="to_stage"
        value={selected}
        disabled={pending}
        onChange={(e) => {
          const to = e.target.value as Stage;
          setSelected(to);
          if (to === "not_yet") {
            setAskingWakeUp(true);
          } else {
            setAskingWakeUp(false);
            submit();
          }
        }}
        className="w-full text-xs rounded-full border border-rule bg-paper-2 px-2 py-1 disabled:opacity-50"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>

      {askingWakeUp && (
        <div className="rounded-lg border border-porch/60 bg-butter p-2 space-y-1.5">
          <label className="block text-[11px] font-semibold text-ink/70">
            Check back on
          </label>
          <input
            type="date"
            name="wake_up_on"
            required
            defaultValue={oneYearOut()}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full text-xs rounded-md border border-rule bg-white px-2 py-1.5"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="flex-1 text-xs rounded-full bg-porch text-night font-semibold py-1.5 disabled:opacity-50"
            >
              Hold warmly
            </button>
            <button
              type="button"
              onClick={() => {
                setAskingWakeUp(false);
                setSelected(stage);
              }}
              className="text-xs rounded-full border border-rule px-3 py-1.5 text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
