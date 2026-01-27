import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env");
  process.exit(1);
}

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;
if (!email || !password) {
  console.error("Faltan ADMIN_SEED_EMAIL o ADMIN_SEED_PASSWORD en .env");
  process.exit(1);
}

async function main() {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users`;
  const payload = { email, password, email_confirm: true };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log("status", res.status);
  console.log("body", text);
}

main().catch((e) => {
  console.error("error", e);
  process.exit(1);
});
