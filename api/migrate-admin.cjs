const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.POSTGRES_URL || "postgresql://neondb_owner:npg_Sd3Q5YBvbXhA@ep-rough-hat-axmc6d3z-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require");

(async () => {
  await sql`CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
  )`;
  console.log("admin_users table created");

  const hash = "$2b$12$9WVtvjf/.JTJQ5qPa3ZY1OPq332kRhIaQP.23TDpsJip8A9muxEHq";
  await sql`INSERT INTO admin_users (username, password_hash) VALUES ('admin', ${hash}) ON CONFLICT (username) DO UPDATE SET password_hash = ${hash}`;
  console.log("admin user created/updated");

  const rows = await sql`SELECT id, username, created_at FROM admin_users`;
  console.log("Users:", JSON.stringify(rows));
})().catch(e => { console.error(e); process.exit(1); });
