/* Applies schema.sql to the database in DATABASE_URL. Run: npm run db:migrate */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("No DATABASE_URL / POSTGRES_URL set. Add it to .env.local or your shell, then retry.");
  process.exit(1);
}

const sql = neon(url);
const ddl = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");

// neon's HTTP driver runs one statement per call — split the file on semicolons.
const statements = ddl
  .split(";")
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter(Boolean);

try {
  for (const stmt of statements) {
    await sql.query(stmt);
    console.log("✓", stmt.split("\n")[0].slice(0, 60));
  }
  console.log("\nMigration complete.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
}
