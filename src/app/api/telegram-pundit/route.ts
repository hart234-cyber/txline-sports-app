import { NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";

// Human-style pundit commentary templates to avoid generic AI speech
const HUMAN_PUNDITRIES = {
  goal: [
    "UNBELIEVABLE! {scorer} has absolutely shredded the defense there. He cuts inside, leaves the keeper grasping at thin air, and slots it home. Absolute class! {team} are in dreamland now, leading {score}!",
    "GOAL! Oh my word, what a sensational strike from {scorer}! From 25 yards out, he has just bent that into the top bin. The keeper had absolutely no chance. {team} break the deadlock and the stadium is rocking! {score}!",
    "GET IN! A poacher's finish from {scorer}! A absolute mess in the box, the keeper spills it, and he's there to poke it in. That is pure desire. {team} take the lead, {score}! Drama at its absolute peak!",
  ],
  red_card: [
    "RED CARD! Absolute madness from {player}! A reckless, studs-up challenge that is a straight red all day long. What was he thinking? {team} are down to ten men and this completely turns the match on its head!",
    "SENT OFF! {player} has been shown a second yellow! A lazy drag back on the halfway line. The referee had no choice. That's a massive blow for {team}, they are going to have to dig deep now to survive this onslaught!",
  ],
  odds_shift: [
    "MARKET ALERT! Look at the betting boards, the smart money is moving fast. The odds on {team} have just drifted from {oldOdds} to {newOdds} in a matter of minutes. The tactical setup is leaking and the traders are running scared!",
    "WOW! A massive odds collapse! {team} odds have crashed down to {newOdds}. The algorithm is anticipating a breakthrough here. If you haven't locked in your stake, you've missed the boat!",
  ]
};

export async function POST(req: Request) {
  // Production rate limiting
  const rate = rateLimit("telegram-pundit", { maxRequests: 10, windowMs: 60000 });
  const rateCheck = rate(req);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again later.", retryAfter: rateCheck.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    // Basic server-side auth: require a secret header to prevent open abuse
    const authHeader = req.headers.get("x-streakline-secret") || "";
    const expectedSecret = process.env.STREAKLINE_SECRET || process.env.TELEGRAM_SECRET || "";
    // User chat messages don't require auth; broadcasts (goal/card/etc) do
    if (expectedSecret && body.eventType !== "message" && authHeader !== expectedSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { botToken, chatId, eventType, homeTeam, awayTeam, score, details, scorer, player, team, oldOdds, newOdds } = body;

    if (!botToken || !chatId) {
      return NextResponse.json({ success: false, error: "Bot token and Chat ID are required" }, { status: 400 });
    }

    let message = "";
    const home = homeTeam || "Home";
    const away = awayTeam || "Away";
    const currentScore = score || "0-0";

    // Select and format human punditry
    if (eventType === "goal") {
      const templates = HUMAN_PUNDITRIES.goal;
      const t = templates[Math.floor(Math.random() * templates.length)];
      message = t
        .replace("{scorer}", scorer || "the striker")
        .replace("{team}", team || home)
        .replace("{score}", currentScore);
    } else if (eventType === "red_card") {
      const templates = HUMAN_PUNDITRIES.red_card;
      const t = templates[Math.floor(Math.random() * templates.length)];
      message = t
        .replace("{player}", player || "the midfielder")
        .replace("{team}", team || home);
    } else if (eventType === "odds_shift") {
      const templates = HUMAN_PUNDITRIES.odds_shift;
      const t = templates[Math.floor(Math.random() * templates.length)];
      message = t
        .replace("{team}", team || home)
        .replace("{oldOdds}", oldOdds || "1.8")
        .replace("{newOdds}", newOdds || "2.9");
    } else {
      // Test message
      message = `🎙️ [StreakLINE AI Pundit Bot Live]\n\n"Right, let's have a look at this tournament. We've got a massive clash lined up between ${home} and ${away}. The atmosphere is absolute electric, and I expect some serious tactical fireworks. Get your predictions locked in!"`;
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    console.log(`[telegram-pundit] Broadcasting to ${chatId}: "${message}"`);

    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });

    const telegramData = await telegramRes.json();

    if (!telegramRes.ok || !telegramData.ok) {
      throw new Error(telegramData.description || "Telegram API Error");
    }

    return NextResponse.json({
      success: true,
      message,
      telegramResponse: telegramData
    });

  } catch (error: any) {
    console.error("[telegram-pundit] Error sending telegram message:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to communicate with Telegram"
    }, { status: 500 });
  }
}
