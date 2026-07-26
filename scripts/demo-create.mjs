// Create (or reset) the demo agency and print its sign-in details.
//   node scripts/demo-create.mjs [.env.local] [email]
// The agency is flagged is_demo, so the send layer refuses to mail anyone in
// it and delete_demo_data can empty it in one call.
import { loadEnv, makeClients } from "./lib.mjs";

const env = loadEnv(process.argv[2] ?? ".env.local");
const { admin } = makeClients(env);
const email = process.argv[3] ?? "demo@porchlight.demo";
const password = "PorchlightDemo!2026";

let { data: agency } = await admin
  .from("agency")
  .select("id, name")
  .eq("is_demo", true)
  .maybeSingle();

if (!agency) {
  const { data, error } = await admin
    .from("agency")
    .insert({ name: "Sonoran Family Services (demo)", is_demo: true })
    .select("id, name")
    .single();
  if (error) throw error;
  agency = data;
  console.log(`created demo agency: ${agency.name}`);
} else {
  console.log(`reusing demo agency: ${agency.name}`);
}

const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
let user = (users?.users ?? []).find((u) => u.email === email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  user = data.user;
  console.log(`created demo user: ${email}`);
} else {
  await admin.auth.admin.updateUserById(user.id, { password });
  console.log(`reset password for existing user: ${email}`);
}

const { data: appUser } = await admin
  .from("app_user")
  .select("id")
  .eq("id", user.id)
  .maybeSingle();
if (!appUser) {
  const { error } = await admin.from("app_user").insert({
    id: user.id,
    agency_id: agency.id,
    full_name: "Demo Director",
    role: "director",
  });
  if (error) throw error;
}

console.log("\n--- demo sign-in ---");
console.log(`email:    ${email}`);
console.log(`password: ${password}`);
console.log(`agency:   ${agency.name} (${agency.id})`);
console.log("\nSign in, then use Settings → Demo data to fill it.");
