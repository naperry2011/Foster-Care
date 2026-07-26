// Dev helper: mint a signed-in session for a throwaway user in an existing
// agency and print the auth cookies, so a browser can be dropped straight into
// the app UI for verification. Local/dev only — never run against production.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const agencyName = process.argv[2] ?? "Testing Org";
const { data: ag } = await admin.from("agency").select("id,name").eq("name", agencyName).single();
if (!ag) throw new Error(`agency "${agencyName}" not found`);

const email = `devsession.${Date.now()}@porchlight.test`;
const password = "Dev-Session-" + Math.random().toString(36).slice(2) + "!aA1";
const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
await admin.from("app_user").insert({ id: u.user.id, agency_id: ag.id, full_name: "Dev Session", role: "director" });

const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: s, error: sErr } = await anon.auth.signInWithPassword({ email, password });
if (sErr) throw sErr;

const ref = new URL(URL_).hostname.split(".")[0];
const encoded = "base64-" + Buffer.from(JSON.stringify(s.session)).toString("base64url");
const MAX = 3180;
const name = `sb-${ref}-auth-token`;
const cookies = encoded.length <= MAX
  ? [[name, encoded]]
  : Array.from({ length: Math.ceil(encoded.length / MAX) },
      (_, i) => [`${name}.${i}`, encoded.slice(i * MAX, (i + 1) * MAX)]);

console.log(JSON.stringify({ userId: u.user.id, agency: ag.name, cookies }));
