import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fallback leaderboard when no database is configured
const DEMO_LEADERBOARD = [
  { walletAddress: "7xKp...3mNq", bestStreak: 14, currentStreak: 14 },
  { walletAddress: "9aRt...8vWx", bestStreak: 11, currentStreak: 7 },
  { walletAddress: "3bYu...2kLp", bestStreak: 9, currentStreak: 9 },
  { walletAddress: "5cZi...6jMn", bestStreak: 8, currentStreak: 0 },
  { walletAddress: "1dAo...4hOq", bestStreak: 7, currentStreak: 3 },
  { walletAddress: "6eBp...9gPr", bestStreak: 6, currentStreak: 6 },
  { walletAddress: "2fCq...7fQs", bestStreak: 5, currentStreak: 2 },
  { walletAddress: "8gDr...1eRt", bestStreak: 4, currentStreak: 4 },
  { walletAddress: "4hEs...5dSu", bestStreak: 3, currentStreak: 1 },
  { walletAddress: "0iGt...3cTv", bestStreak: 2, currentStreak: 0 },
];

export async function GET() {
  try {
    // Try database if configured
    const { db } = await import("@/db");
    if (db) {
      const { users } = await import("@/db/schema");
      const { desc } = await import("drizzle-orm");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topUsers = await (db as any).query.users.findMany({
        orderBy: [desc(users.bestStreak)],
        limit: 10,
      });
      return NextResponse.json({ success: true, leaderboard: topUsers });
    }
  } catch {
    // Fall through to demo data
  }

  // No database — return demo leaderboard
  return NextResponse.json({
    success: true,
    leaderboard: DEMO_LEADERBOARD,
    demo: true,
  });
}