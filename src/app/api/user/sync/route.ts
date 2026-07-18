import { NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Production rate limiting
  const rate = rateLimit("user-sync", { maxRequests: 30, windowMs: 60000 });
  const rateCheck = rate(req);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again later.", retryAfter: rateCheck.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
    );
  }

  try {
    const { walletAddress, currentStreak, bestStreak, username } =
      await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Try database if configured
    try {
      const { db } = await import("@/db");
      if (db) {
        const { users } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyDb = db as any;

        const existingUser = await anyDb.query.users.findFirst({
          where: eq(users.walletAddress, walletAddress),
        });

        if (existingUser) {
          await anyDb
            .update(users)
            .set({
              currentStreak:
                currentStreak !== undefined
                  ? currentStreak
                  : existingUser.currentStreak,
              bestStreak: Math.max(
                existingUser.bestStreak,
                bestStreak || 0
              ),
              username: username || existingUser.username,
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id));

          return NextResponse.json({
            success: true,
            user: {
              ...existingUser,
              currentStreak,
              bestStreak: Math.max(existingUser.bestStreak, bestStreak || 0),
            },
          });
        } else {
          const [newUser] = await anyDb
            .insert(users)
            .values({
              walletAddress,
              username: username || walletAddress.slice(0, 6),
              currentStreak: currentStreak || 0,
              bestStreak: bestStreak || 0,
            })
            .returning();

          return NextResponse.json({ success: true, user: newUser });
        }
      }
    } catch {
      // No database — fall through to localStorage-only mode
    }

    // No database configured — acknowledge the sync without persisting
    return NextResponse.json({
      success: true,
      demo: true,
      message: "Streak saved locally. Set DATABASE_URL to enable persistent leaderboard.",
      user: {
        walletAddress,
        currentStreak: currentStreak || 0,
        bestStreak: bestStreak || 0,
      },
      toast: { type: "warning", message: "Leaderboard uses localStorage — set DATABASE_URL for persistent scores." },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Sync error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}