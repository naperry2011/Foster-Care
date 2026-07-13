"use client";

import { useRef, useTransition } from "react";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";
import { moveStage } from "@/app/contacts/actions";

export default function StageSelect({
  contactId,
  stage,
}: {
  contactId: string;
  stage: Stage;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={moveStage}>
      <input type="hidden" name="contact_id" value={contactId} />
      <select
        name="to_stage"
        defaultValue={stage}
        disabled={pending}
        onChange={(e) => {
          const to = e.target.value as Stage;
          if (to === "not_yet") {
            const d = prompt(
              "Wake-up date (YYYY-MM-DD)? Leave blank for none.",
              new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                .toISOString()
                .slice(0, 10)
            );
            if (d) {
              const hidden = document.createElement("input");
              hidden.type = "hidden";
              hidden.name = "wake_up_on";
              hidden.value = d;
              formRef.current?.appendChild(hidden);
            }
          }
          startTransition(() => formRef.current?.requestSubmit());
        }}
        className="text-xs rounded-full border border-rule bg-paper-2 px-2 py-1 disabled:opacity-50"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
