import { NextResponse } from "next/server";

// TxLINE World Cup – Devnet Free Tier SL1
// Fetches REAL fixtures from TxLINE API using activated token

const ORIGINS = ["https://txline-dev.txodds.com", "https://txline.txodds.com"];

function getApiToken(req: Request): string {
  const envToken = process.env.NEXT_PUBLIC_TXLINE_API_TOKEN || process.env.TXLINE_API_TOKEN || "";
  if (envToken && !envToken.includes("paste") && !envToken.startsWith("demo_")) return envToken;
  const url = new URL(req.url);
  return url.searchParams.get("token") || "";
}

async function getGuestJwt(): Promise<{ jwt: string | null; origin: string }> {
  for (const origin of ORIGINS) {
    try {
      const r = await fetch(`${origin}/auth/guest/start`, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const j = await r.json();
      if (j.token) return { jwt: j.token, origin };
    } catch { continue; }
  }
  return { jwt: null, origin: "" };
}

export async function GET(req: Request) {
  const API_TOKEN = getApiToken(req);
  const { jwt: guestJwt, origin } = await getGuestJwt();

  console.log("[fixtures] JWT:", guestJwt ? "yes (" + origin + ")" : "no",
    "| Token:", API_TOKEN ? API_TOKEN.slice(0, 24) + "…" : "MISSING");

  // Try BOTH origins with the token (token might work on devnet even if JWT came from mainnet)
  if (guestJwt && API_TOKEN) {
    for (const tryOrigin of ORIGINS) {
      try {
        // Get a JWT from THIS specific origin
        let jwtForOrigin = guestJwt;
        if (tryOrigin !== origin) {
          try {
            const r2 = await fetch(`${tryOrigin}/auth/guest/start`, {
              method: "POST", cache: "no-store", signal: AbortSignal.timeout(5000),
            });
            if (r2.ok) {
              const j2 = await r2.json();
              if (j2.token) jwtForOrigin = j2.token;
            }
          } catch { continue; }
        }

        console.log("[fixtures] Trying fixtures from", tryOrigin);
        const r = await fetch(`${tryOrigin}/api/fixtures/snapshot`, {
          headers: {
            Authorization: `Bearer ${jwtForOrigin}`,
            "X-Api-Token": API_TOKEN,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });

        if (r.ok) {
          const rawData = await r.json();
          console.log("[fixtures] Got", Array.isArray(rawData) ? rawData.length : "?", "fixtures from", tryOrigin);

          if (Array.isArray(rawData) && rawData.length > 0) {
            // Transform TxLINE format → our Fixture format
            const data = rawData.map((f: any) => ({
              fixtureId: f.FixtureId || f.fixtureId || f.id || 0,
              home: f.Participant1 || f.home || f.participant1?.name || "Home",
              away: f.Participant2 || f.away || f.participant2?.name || "Away",
              homeCode: (f.Participant1 || f.home || "").slice(0, 3).toUpperCase(),
              awayCode: (f.Participant2 || f.away || "").slice(0, 3).toUpperCase(),
              status: f.GameState === 1 ? "Scheduled" : f.GameState === 6 ? "Cancelled" : "LIVE",
              competition: f.Competition || "World Cup",
              competitionId: f.CompetitionId || 0,
              startTime: f.StartTime || 0,
              participant1IsHome: f.Participant1IsHome ?? true,
            }));

            return NextResponse.json({
              success: true,
              data,
              source: "txline_live",
              count: data.length,
              origin: tryOrigin,
            });
          }
        } else {
          const err = await r.text().catch(() => "");
          console.error("[fixtures]", tryOrigin, "returned", r.status, err.slice(0, 100));
          // If 403 on this origin, try the other
          if (r.status === 403) continue;
        }
      } catch (e: any) {
        console.error("[fixtures] Error on", tryOrigin, ":", e.message?.slice(0, 80));
        continue;
      }
    }
  }

  // Fallback: Demo fixtures with real World Cup 2026 teams
  const replay = [
    { fixtureId: 2601001, home: "United States", homeCode: "USA", away: "Mexico", awayCode: "MEX", status: "LIVE", minute: 67, competition: "FIFA World Cup 2026" },
    { fixtureId: 2601002, home: "Argentina", homeCode: "ARG", away: "Nigeria", awayCode: "NGA", status: "LIVE", minute: 54, competition: "FIFA World Cup 2026" },
    { fixtureId: 2601003, home: "France", homeCode: "FRA", away: "Senegal", awayCode: "SEN", status: "2H", minute: 73, competition: "FIFA World Cup 2026" },
    { fixtureId: 2601004, home: "England", homeCode: "ENG", away: "United States", awayCode: "USA", status: "1H", minute: 38, competition: "FIFA World Cup 2026" },
    { fixtureId: 2601005, home: "Brazil", homeCode: "BRA", away: "Croatia", awayCode: "CRO", status: "LIVE", minute: 61, competition: "FIFA World Cup 2026" },
    { fixtureId: 2601006, home: "Spain", homeCode: "ESP", away: "Japan", awayCode: "JPN", status: "HT", minute: 45, competition: "FIFA World Cup 2026" },
    { fixtureId: 2601007, home: "Portugal", homeCode: "POR", away: "Morocco", awayCode: "MAR", status: "LIVE", minute: 58, competition: "FIFA World Cup 2026" },
    { fixtureId: 2601008, home: "Germany", homeCode: "GER", away: "Colombia", awayCode: "COL", status: "LIVE", minute: 71, competition: "FIFA World Cup 2026" },
  ];

  const note = API_TOKEN
    ? "Token present but TxLINE returned no fixtures or was unreachable. Showing demo."
    : "No API token. Visit /activate to get one.";

  return NextResponse.json({ success: true, data: replay, source: "demo", note });
}
