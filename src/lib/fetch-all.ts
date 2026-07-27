import "server-only";

// Supabase sets PostgREST's max-rows to 1000 on hosted projects. A query that
// matches more comes back with the first 1000 rows, HTTP 200, no error and no
// truncation flag. Nothing in the client tells you it happened.
//
// That is the worst shape a limit can have: the ledger under-reports in front
// of a funder, and the cron silently stops nurturing past the thousandth
// contact, both while reporting success. Every unbounded read now goes through
// here instead.
const PAGE = 1000;

// A runaway guard, not a real limit. Hitting this means a query is matching
// half a million rows and the caller wants an aggregate, not a list.
const MAX_PAGES = 500;

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAll<T>(
  page: (from: number, to: number) => Page<T>,
  label = "query"
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE;
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const rows = data ?? [];
    out.push(...rows);
    // A short page is the only reliable end-of-results signal PostgREST gives.
    if (rows.length < PAGE) return out;
  }
  // Loud rather than silent, which is the whole point of this file.
  console.error(
    `fetchAll(${label}) stopped at ${MAX_PAGES * PAGE} rows. Results are truncated.`
  );
  return out;
}
