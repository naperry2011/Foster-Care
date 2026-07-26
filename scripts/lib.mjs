import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

export function loadEnv(path = ".env.local") {
  return Object.fromEntries(
    fs.readFileSync(path, "utf8").split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
      })
  );
}

export function makeClients(env) {
  return {
    admin: createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    }),
    anon: createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    }),
  };
}

const PW = () => "Smoke-" + Math.random().toString(36).slice(2, 12) + "!aA1";

// A signed-in member of an agency. Erasure and stage moves are deliberately
// unavailable to service_role, so scripts act as a real user like the app does.
export async function makeUserIn(env, admin, agencyId, label = "user") {
  const email = `smoke+${label}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@porchlight.test`;
  const password = PW();
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  await admin.from("app_user").insert({
    id: u.user.id, agency_id: agencyId, full_name: `Smoke ${label}`, role: "director",
  });
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: sErr } = await client.auth.signInWithPassword({ email, password });
  if (sErr) throw sErr;
  return { userId: u.user.id, email, client };
}

export async function makeTenant(env, admin, label) {
  const { data: ag, error } = await admin.from("agency")
    .insert({ name: `Smoke ${label} ${Date.now()}` }).select("id").single();
  if (error) throw error;
  const u = await makeUserIn(env, admin, ag.id, label);
  return { agencyId: ag.id, ...u };
}

// Remove an agency and everything under it. Contacts must go through
// delete_contact() as a signed-in member — append-only history rejects a
// plain DELETE by design.
export async function purgeAgency(env, admin, agencyId) {
  // always mint a throwaway member: existing users' passwords are unknown
  const { client } = await makeUserIn(env, admin, agencyId, "purge");

  const { data: contacts } = await admin.from("contact").select("id").eq("agency_id", agencyId);
  for (const c of contacts ?? []) {
    const { error } = await client.rpc("delete_contact", { p_contact_id: c.id });
    if (error) console.log(`  ! could not erase ${c.id}: ${error.message}`);
  }
  // Agency-scoped rows that do NOT hang off a contact — outcome_confirm tasks
  // carry contact_id = null, so nothing cascades them and they would block the
  // agency delete on a foreign key.
  await admin.from("task").delete().eq("agency_id", agencyId);
  await admin.from("send_log").delete().eq("agency_id", agencyId);
  await admin.from("source").delete().eq("agency_id", agencyId);

  const { data: users } = await admin.from("app_user").select("id").eq("agency_id", agencyId);
  await admin.from("app_user").delete().eq("agency_id", agencyId);
  for (const u of users ?? []) await admin.auth.admin.deleteUser(u.id);
  await admin.from("agency").delete().eq("id", agencyId);
}
