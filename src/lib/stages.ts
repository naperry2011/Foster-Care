export const STAGES = [
  "unaware",
  "curious",
  "considering",
  "not_yet",
  "inquiry",
  "licensed",
  "declined",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  unaware: "Unaware",
  curious: "Curious",
  considering: "Considering",
  not_yet: "Not yet",
  inquiry: "Inquiry",
  licensed: "Licensed",
  declined: "Declined",
};

// Board shows the working funnel; not_yet is a parallel holding lane.
export const BOARD_STAGES: Stage[] = [
  "curious",
  "considering",
  "not_yet",
  "inquiry",
  "licensed",
];

export const SOURCE_KINDS = [
  "event",
  "ambassador",
  "digital",
  "partner",
  "walk_in",
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  event: "Event",
  ambassador: "Ambassador",
  digital: "Digital",
  partner: "Partner",
  walk_in: "Walk-in",
};
