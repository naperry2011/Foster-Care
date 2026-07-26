import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Join · Porchlight" };

// The other side of /settings/team. The invitee has no agency yet, so RLS
// hides agency_invite from them entirely — everything here goes through the
// security-definer RPCs in migration 0009.
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/join/${token}`);

  // Already in an agency: there is nothing to accept.
  const { data: existing } = await supabase
    .from("app_user")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) redirect("/");

  const { data: preview } = await supabase.rpc("invite_preview", { p_token: token });
  const invite = (preview ?? [])[0] as
    | { agency_name: string; invited_email: string; valid: boolean }
    | undefined;

  async function accept() {
    "use server";
    const { createClient: createServer } = await import("@/lib/supabase/server");
    const supabase = await createServer();
    const { error } = await supabase.rpc("accept_invite", { p_token: token });
    if (error) throw error;
    redirect("/");
  }

  const mismatch =
    invite && invite.invited_email.toLowerCase() !== (user.email ?? "").toLowerCase();

  return (
    <main className="min-h-screen bg-dusk flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold text-white">
          {invite?.valid && !mismatch
            ? `Join ${invite.agency_name}`
            : "This invitation can't be used"}
        </h1>

        {!invite && (
          <p className="text-white/70 text-sm mt-3">
            We don&rsquo;t recognise this link. Ask whoever invited you to send
            a new one.
          </p>
        )}

        {invite && !invite.valid && (
          <p className="text-white/70 text-sm mt-3">
            It has already been used, revoked, or expired. Ask for a fresh
            invitation.
          </p>
        )}

        {invite?.valid && mismatch && (
          <p className="text-white/70 text-sm mt-3">
            This invitation was sent to <strong>{invite.invited_email}</strong>,
            but you&rsquo;re signed in as <strong>{user.email}</strong>. Sign in
            with the invited address to accept it.
          </p>
        )}

        {invite?.valid && !mismatch && (
          <>
            <p className="text-white/70 text-sm mt-3">
              You&rsquo;ll see the same contacts, waiting room and ledger as
              everyone else at {invite.agency_name}.
            </p>
            <form action={accept} className="mt-6">
              <button className="w-full rounded-full bg-porch text-night font-semibold py-3 hover:brightness-105">
                Accept invitation
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
