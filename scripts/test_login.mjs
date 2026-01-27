import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, anon);

const email = process.env.TEST_LOGIN_EMAIL;
const password = process.env.TEST_LOGIN_PASSWORD;
if (!email || !password) {
  console.error("Faltan TEST_LOGIN_EMAIL o TEST_LOGIN_PASSWORD en .env");
  process.exit(1);
}

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log("error", error?.message || error);
  console.log("data", JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error("fatal", e);
  process.exit(1);
});
