import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { verifySystemSecret } from "@/lib/system-auth";

// Somewhere for a monitor to point. (audit F-011)
//
// cron_run records what happened; this is the thing that notices nothing did.
// Nobody opens a health page on the day it matters, so the contract here is the
// status code: 200 while the tick is healthy, 503 the moment it is not. Point
// any uptime monitor at this URL and a dead cron becomes an email to a human
// instead of a quiet week that looks exactly like a slow one.
//
// Read-only, and guarded by CRON_SECRET like the tick it reports on — the body
// carries per-agency send counts and has no business being public.

// The tick runs daily (vercel.json, 15:00 UTC). One missed run plus room for a
// late start is the line: below this a delayed tick is not woken up over, above
// it a real gap is never sat on for a second day.
const STALE_AFTER_HOURS = 36;

export async function GET(request: Request) {
  const header = request.headers.get("authorization");
  if (
    !verifySystemSecret(
      header?.replace(/^Bearer /, "") ?? null,
      process.env.CRON_SECRET
    )
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: last, error } = await admin
    .from("cron_run")
    .select("started_at, finished_at, ok, stats, errors")
    .eq("job", "tick")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Migration 0013 is applied by hand, so "table isn't there yet" is a real
  // state rather than an outage. Say which it is instead of returning a 500
  // that a monitor would read as a dead cron.
  if (error) {
    return NextResponse.json(
      { ok: false, reason: "cron_run unavailable", detail: error.message },
      { status: 503 }
    );
  }

  // No rows means the tick has not run once since the table existed. That is
  // indistinguishable from a broken cron and is treated as one.
  if (!last) {
    return NextResponse.json(
      { ok: false, reason: "no run recorded" },
      { status: 503 }
    );
  }

  const ageHours =
    (Date.now() - new Date(last.started_at).getTime()) / 3_600_000;
  const stale = ageHours > STALE_AFTER_HOURS;
  // A run that started and never finished is the shape of a timeout, and it is
  // exactly what a single "last run" timestamp would have hidden.
  const unfinished = !last.finished_at;
  const healthy = !stale && !unfinished && last.ok === true;

  return NextResponse.json(
    {
      ok: healthy,
      stale,
      unfinished,
      ageHours: Math.round(ageHours * 10) / 10,
      lastStartedAt: last.started_at,
      lastFinishedAt: last.finished_at,
      lastOk: last.ok,
      stats: last.stats,
      errors: last.errors,
    },
    { status: healthy ? 200 : 503 }
  );
}
