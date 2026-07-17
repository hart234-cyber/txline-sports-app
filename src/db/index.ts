import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

// Gracefully handle missing DATABASE_URL — the app runs in localStorage mode
// without a database. Set DATABASE_URL in .env.local or Vercel env vars to
// enable persistent leaderboard and wallet sync.
if (!databaseUrl && process.env.NODE_ENV === "production") {
  console.warn(
    "[StreakLine] DATABASE_URL not set — leaderboard and wallet sync will use in-memory fallback."
  );
}

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (databaseUrl) {
  const globalForDb = globalThis as typeof globalThis & {
    __streaklinePool?: Pool;
  };

  pool =
    globalForDb.__streaklinePool ??
    new Pool({ connectionString: databaseUrl });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__streaklinePool = pool;
  }

  db = drizzle(pool, { schema });
}

export { pool, db };
