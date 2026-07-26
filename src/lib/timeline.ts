import { STAGE_LABELS, type Stage } from "@/lib/stages";

export type TouchChannel = "sms" | "email" | "call" | "in_person";

export const TOUCH_CHANNEL_LABELS: Record<TouchChannel, string> = {
  call: "Phone call",
  in_person: "In person",
  email: "Email",
  sms: "Text",
};

export type TimelineEntry = {
  id: string;
  at: string;
  kind: "touch_in" | "touch_out" | "stage" | "send" | "task";
  title: string;
  body?: string | null;
  meta?: string | null;
};

type TouchRow = {
  id: string;
  direction: string;
  channel: string;
  occurred_at: string;
  body: string | null;
};
type StageRow = {
  id: string;
  from_stage: string | null;
  to_stage: string;
  occurred_at: string;
  reason: string | null;
};
type SendRow = {
  id: string;
  dedupe_key: string;
  status: string;
  sent_at: string;
  nurture_template?: { subject: string } | null;
};
type TaskRow = {
  id: string;
  kind: string;
  title: string;
  created_at: string;
  done_at: string | null;
};

const stageLabel = (s: string | null) =>
  s ? (STAGE_LABELS[s as Stage] ?? s) : null;

// One story per contact, assembled from four append-only sources. Sorted
// newest first — a recruiter opening a record wants "what just happened".
export function buildTimeline({
  touches,
  stageChanges,
  sends,
  tasks,
}: {
  touches: TouchRow[];
  stageChanges: StageRow[];
  sends: SendRow[];
  tasks: TaskRow[];
}): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const t of touches) {
    const channel =
      TOUCH_CHANNEL_LABELS[t.channel as TouchChannel] ?? t.channel;
    const inbound = t.direction === "in";
    entries.push({
      id: `touch-${t.id}`,
      at: t.occurred_at,
      kind: inbound ? "touch_in" : "touch_out",
      title: inbound ? `${channel} from them` : `${channel} sent`,
      body: t.body,
    });
  }

  for (const s of stageChanges) {
    const from = stageLabel(s.from_stage);
    const to = stageLabel(s.to_stage);
    entries.push({
      id: `stage-${s.id}`,
      at: s.occurred_at,
      kind: "stage",
      title: from ? `Moved from ${from} to ${to}` : `Captured as ${to}`,
      meta: s.reason,
    });
  }

  for (const s of sends) {
    // a claimed-but-unsent row is in flight, not history
    if (s.status === "sending") continue;
    entries.push({
      id: `send-${s.id}`,
      at: s.sent_at,
      kind: "send",
      title: s.nurture_template?.subject
        ? `Nurture email: “${s.nurture_template.subject}”`
        : "Nurture email sent",
      meta: s.status === "sent" ? null : s.status,
    });
  }

  for (const t of tasks) {
    entries.push({
      id: `task-${t.id}`,
      at: t.created_at,
      kind: "task",
      title: t.title,
      meta: t.done_at ? "done" : "open",
    });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function relativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30.4);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.floor(months / 12)} years ago`;
}
