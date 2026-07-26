// Remove agencies left behind by test runs. Matches known test-name prefixes
// only, and prints exactly what it will remove before doing it.
import { loadEnv, makeClients, purgeAgency } from "./lib.mjs";

const PREFIXES = ["Smoke ", "Smoke A", "Smoke B", "Cron Smoke", "Anon Audit"];

const env = loadEnv(process.argv[2] ?? ".env.local");
const { admin } = makeClients(env);

const { data: agencies } = await admin.from("agency").select("id,name");
const doomed = (agencies ?? []).filter((a) => PREFIXES.some((p) => a.name.startsWith(p)));
const kept = (agencies ?? []).filter((a) => !doomed.includes(a));

console.log("keeping: ", kept.map((a) => a.name).join(", ") || "(none)");
console.log("removing:", doomed.map((a) => a.name).join(", ") || "(none)");

for (const a of doomed) {
  await purgeAgency(env, admin, a.id);
  console.log(`  purged ${a.name}`);
}

// throwaway auth users from dev-session / purge helpers
const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
const strays = (users?.users ?? []).filter(
  (u) => u.email?.endsWith("@porchlight.test") || u.email?.startsWith("smoke+")
);
for (const u of strays) {
  const { data: linked } = await admin.from("app_user").select("id").eq("id", u.id).maybeSingle();
  if (!linked) {
    await admin.auth.admin.deleteUser(u.id);
    console.log(`  removed stray user ${u.email}`);
  }
}
console.log("done");
