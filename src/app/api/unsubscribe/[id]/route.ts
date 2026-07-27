import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// RFC 8058 one-click unsubscribe, the machine-facing half.
//
// Gmail and Outlook show their own "unsubscribe" button when a message carries
// List-Unsubscribe-Post, and they POST here when it is pressed. That press is a
// real person acting deliberately in their mail client, so it opts out
// immediately with no confirmation screen -- which is the whole point of
// one-click, and is required for bulk-sender compliance.
//
// POST only. A scanner or prefetcher issues GET, gets 405, and changes nothing.
// The human-clickable link in the message body points at /u/[id] instead, which
// asks first.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await anon.rpc("public_unsubscribe", { p_contact_id: id });

  // Always 200. Mail providers retry on failure, and the RPC is idempotent, so
  // a repeat is harmless. Reporting whether the id existed would let anyone
  // enumerate contact ids against this endpoint.
  return new NextResponse(null, { status: 200 });
}
