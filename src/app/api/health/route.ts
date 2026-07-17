export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/db");
    if (db) {
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`select 1`);
      return Response.json({ ok: true, db: true });
    }
    return Response.json({ ok: true, db: false, note: "No DATABASE_URL configured" });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
