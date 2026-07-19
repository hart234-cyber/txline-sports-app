import { NextResponse } from "next/server";

export const runtime = "nodejs";

// TxLINE API configuration
const TXLINE_ORIGINS = [
  "https://txline-dev.txodds.com",  // devnet FIRST — free-tier tokens are devnet
  "https://txline.txodds.com",       // mainnet fallback
];

function getApiToken(req: Request): string {
  const envToken = process.env.TXLINE_API_TOKEN || "";
  if (envToken && !envToken.startsWith("demo_") && !envToken.includes("paste"))
    return envToken;
  const url = new URL(req.url);
  return url.searchParams.get("token") || "";
}

async function getGuestJwt(origin: string): Promise<string | null> {
  try {
    const r = await fetch(`${origin}/auth/guest/start`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.token || null;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWC(competition: string): boolean {
  const c = competition.toLowerCase();
  return (
    c.includes("world cup") ||
    c.includes("worldcup") ||
    c.includes("wc2026") ||
    c.includes("fifa wc") ||
    c.includes("coupe du monde")
  );
}

/** Sort key: LIVE first, then upcoming (asc), then recent FT (desc by recency) */
function sortKey(status: string, startTime: number, now: number): number {
  const live = status === "1H" || status === "2H" || status === "HT" || status === "LIVE";
  const upcoming = status === "Scheduled" || status === "NS";
  if (live) return 0;
  if (upcoming) return 1_000_000_000 + startTime; // ascending by kick-off
  return 3_000_000_000 - startTime; // FT: most recent first (smaller = higher priority)
}

// ─── Fallback demo schedule ────────────────────────────────────────────────────
// Shown when no TxLINE API token is set.
// Includes WC2026 final-stage + representative fixtures from other competitions
// so the app looks rich even in demo mode.
function getDemoFixtures() {
  const now = Date.now();

  type RawFixture = {
    fixtureId: number;
    home: string;
    homeCode: string;
    away: string;
    awayCode: string;
    startTime: number;
    venue: string;
    round: string;
    competition: string;
    group?: string;
  };

  const schedule: RawFixture[] = [
    // ── FIFA WORLD CUP 2026 ──────────────────────────────────────────────────────
    // 3rd Place Match (FT)
    {
      fixtureId: 2626003,
      home: "England",
      homeCode: "ENG",
      away: "France",
      awayCode: "FRA",
      startTime: new Date("2026-07-18T23:00:00Z").getTime(),
      venue: "Hard Rock Stadium, Miami",
      round: "3rd Place",
      competition: "FIFA World Cup 2026",
    },
    // Final
    {
      fixtureId: 2626004,
      home: "Spain",
      homeCode: "ESP",
      away: "Argentina",
      awayCode: "ARG",
      startTime: new Date("2026-07-19T19:00:00Z").getTime(),
      venue: "MetLife Stadium, New Jersey",
      round: "Final",
      competition: "FIFA World Cup 2026",
    },
    // Semi-finals (FT)
    {
      fixtureId: 2626001,
      home: "Spain",
      homeCode: "ESP",
      away: "France",
      awayCode: "FRA",
      startTime: new Date("2026-07-14T20:00:00Z").getTime(),
      venue: "AT&T Stadium, Dallas",
      round: "Semi-Final",
      competition: "FIFA World Cup 2026",
    },
    {
      fixtureId: 2626002,
      home: "Argentina",
      homeCode: "ARG",
      away: "England",
      awayCode: "ENG",
      startTime: new Date("2026-07-15T22:00:00Z").getTime(),
      venue: "Mercedes-Benz Stadium, Atlanta",
      round: "Semi-Final",
      competition: "FIFA World Cup 2026",
    },
    // Quarter-finals (FT)
    {
      fixtureId: 2625001,
      home: "France",
      homeCode: "FRA",
      away: "Morocco",
      awayCode: "MAR",
      startTime: new Date("2026-07-09T20:00:00Z").getTime(),
      venue: "Gillette Stadium, Boston",
      round: "Quarter-Final",
      competition: "FIFA World Cup 2026",
    },
    {
      fixtureId: 2625002,
      home: "Spain",
      homeCode: "ESP",
      away: "Belgium",
      awayCode: "BEL",
      startTime: new Date("2026-07-10T19:00:00Z").getTime(),
      venue: "SoFi Stadium, Los Angeles",
      round: "Quarter-Final",
      competition: "FIFA World Cup 2026",
    },
    {
      fixtureId: 2625003,
      home: "England",
      homeCode: "ENG",
      away: "Norway",
      awayCode: "NOR",
      startTime: new Date("2026-07-11T21:00:00Z").getTime(),
      venue: "Hard Rock Stadium, Miami",
      round: "Quarter-Final",
      competition: "FIFA World Cup 2026",
    },
    {
      fixtureId: 2625004,
      home: "Argentina",
      homeCode: "ARG",
      away: "Switzerland",
      awayCode: "SUI",
      startTime: new Date("2026-07-12T01:00:00Z").getTime(),
      venue: "Arrowhead Stadium, Kansas City",
      round: "Quarter-Final",
      competition: "FIFA World Cup 2026",
    },

    // ── MLS 2026 ─────────────────────────────────────────────────────────────
    {
      fixtureId: 3001001,
      home: "Inter Miami CF",
      homeCode: "MIA",
      away: "LA Galaxy",
      awayCode: "LAG",
      startTime: new Date("2026-07-17T23:30:00Z").getTime(),
      venue: "Chase Stadium, Fort Lauderdale",
      round: "MLS Regular Season",
      competition: "MLS 2026",
    },
    {
      fixtureId: 3001002,
      home: "NYCFC",
      homeCode: "NYC",
      away: "Atlanta United",
      awayCode: "ATL",
      startTime: new Date("2026-07-18T23:30:00Z").getTime(),
      venue: "Yankee Stadium, New York",
      round: "MLS Regular Season",
      competition: "MLS 2026",
    },
    {
      fixtureId: 3001003,
      home: "Seattle Sounders",
      homeCode: "SEA",
      away: "Portland Timbers",
      awayCode: "POR",
      startTime: new Date("2026-07-19T02:00:00Z").getTime(),
      venue: "Lumen Field, Seattle",
      round: "MLS Regular Season",
      competition: "MLS 2026",
    },

    // ── Serie A 2025/26 ───────────────────────────────────────────────────────
    {
      fixtureId: 4001001,
      home: "AC Milan",
      homeCode: "MIL",
      away: "Juventus",
      awayCode: "JUV",
      startTime: new Date("2026-07-18T19:45:00Z").getTime(),
      venue: "San Siro, Milan",
      round: "Serie A Matchday 38",
      competition: "Serie A 2025/26",
    },
    {
      fixtureId: 4001002,
      home: "Inter Milan",
      homeCode: "INT",
      away: "Napoli",
      awayCode: "NAP",
      startTime: new Date("2026-07-18T17:00:00Z").getTime(),
      venue: "Giuseppe Meazza, Milan",
      round: "Serie A Matchday 38",
      competition: "Serie A 2025/26",
    },

    // ── International Friendlies ──────────────────────────────────────────────
    {
      fixtureId: 5001001,
      home: "USA",
      homeCode: "USA",
      away: "Mexico",
      awayCode: "MEX",
      startTime: new Date("2026-07-18T01:00:00Z").getTime(),
      venue: "Rose Bowl, Pasadena",
      round: "International Friendly",
      competition: "International Friendly",
    },
    {
      fixtureId: 5001002,
      home: "Brazil",
      homeCode: "BRA",
      away: "Colombia",
      awayCode: "COL",
      startTime: new Date("2026-07-19T00:00:00Z").getTime(),
      venue: "Estadio Maracanã, Rio de Janeiro",
      round: "International Friendly",
      competition: "International Friendly",
    },

    // ── Copa América 2026 (Warm-up) ───────────────────────────────────────────
    {
      fixtureId: 6001001,
      home: "Uruguay",
      homeCode: "URU",
      away: "Chile",
      awayCode: "CHI",
      startTime: new Date("2026-07-19T22:00:00Z").getTime(),
      venue: "Estadio Centenario, Montevideo",
      round: "Copa América Qualifier",
      competition: "Copa América 2026",
    },
  ];

  // Keep all WC matches visible (FT or upcoming), filter non-WC if >8h old
  const eightHoursAgo = now - 8 * 60 * 60 * 1000;

  return schedule
    .filter((f) => {
      // Always keep World Cup matches visible
      if (isWC(f.competition)) return true;
      const msSince = now - f.startTime;
      const isPast = msSince >= 7200000;
      if (isPast && f.startTime < eightHoursAgo) return false;
      return true;
    })
    .map((f) => {
      const msSince = now - f.startTime;
      const isLive = msSince > 0 && msSince < 7200000;
      const isPast = msSince >= 7200000;
      const minute = isLive ? Math.min(90, Math.floor(msSince / 60000)) : 0;

      const knownFT = new Set([2626003, 2626001, 2626002, 2625001, 2625002, 2625003, 2625004]);
      let status = "Scheduled";
      if (knownFT.has(f.fixtureId)) status = "FT";
      else if (isPast) status = "FT";
      else if (isLive && minute <= 45) status = "1H";
      else if (isLive && minute > 45 && minute <= 50) status = "HT";
      else if (isLive && minute > 50) status = "2H";

      return {
        fixtureId: f.fixtureId,
        home: f.home,
        homeCode: f.homeCode,
        away: f.away,
        awayCode: f.awayCode,
        status,
        minute: isLive ? minute : 0,
        homeScore: ({
          2626003: 6, // England 6-4 France (3rd Place)
          2626001: 2, // Spain 2-0 France (SF)
          2626002: 2, // Argentina 2-1 England (SF)
          2625001: 2, // France 2-0 Morocco (QF)
          2625002: 2, // Spain 2-1 Belgium (QF) — Sporting News says 1-0, Olympics.com says 2-1
          2625003: 2, // England 2-1 Norway (QF, AET)
          2625004: 3, // Argentina 3-1 Switzerland (QF, AET)
        } as Record<number, number>)[f.fixtureId] ?? 0,
        awayScore: ({
          2626003: 4,
          2626001: 0,
          2626002: 1,
          2625001: 0,
          2625002: 1,
          2625003: 1,
          2625004: 1,
        } as Record<number, number>)[f.fixtureId] ?? 0,
        competition: f.competition,
        startTime: f.startTime,
        venue: f.venue,
        round: f.round,
        group: f.group || "",
      };
    })
    .sort((a, b) => {
      // WC first, then other competitions
      const aWC = isWC(a.competition) ? 0 : 1;
      const bWC = isWC(b.competition) ? 0 : 1;
      if (aWC !== bWC) return aWC - bWC;
      return sortKey(a.status, a.startTime, now) - sortKey(b.status, b.startTime, now);
    });
}

// ─── Normalize a raw TxLINE fixture object ────────────────────────────────────
function normalizeTxLineFixture(f: Record<string, unknown>, now: number) {
  // Bug fix: TxLINE devnet returns StartTime in milliseconds (13 digits).
  // Detect ms vs seconds to avoid year-58000 bug.
  const rawSt =
    typeof f.StartTime === "number"
      ? f.StartTime
      : typeof f.startTime === "number"
      ? f.startTime
      : 0;
  const startMs = rawSt > 1e12 ? rawSt : rawSt > 0 ? rawSt * 1000 : 0;

  const msSince = now - startMs;
  const isLive = msSince > 0 && msSince < 7200000;
  const isPast = msSince >= 7200000;
  const minute = isLive ? Math.min(90, Math.floor(msSince / 60000)) : 0;

  const gsState = typeof f.GameState === "number" ? f.GameState : null;
  let status = "Scheduled";
  if (gsState === 2 || gsState === 3) status = "1H";
  else if (gsState === 4) status = "HT";
  else if (gsState === 5) status = "2H";
  else if (gsState === 8 || isPast) status = "FT";
  // Bug fix: devnet keeps GameState=1 even for live matches — infer from elapsed time
  else if (gsState === 1 && isLive) status = minute <= 45 ? "1H" : minute <= 50 ? "HT" : "2H";
  else if (isLive) status = minute <= 45 ? "1H" : "2H";

  const home = (f.Participant1 as string) || (f.home as string) || "Home";
  const away = (f.Participant2 as string) || (f.away as string) || "Away";
  const competition =
    (f.Competition as string) ||
    (f.competition as string) ||
    (f.League as string) ||
    (f.league as string) ||
    "Unknown Competition";

  return {
    fixtureId:
      (f.FixtureId as number) ||
      (f.fixtureId as number) ||
      (f.id as number) ||
      0,
    home,
    homeCode: home.slice(0, 3).toUpperCase(),
    away,
    awayCode: away.slice(0, 3).toUpperCase(),
    status,
    minute,
    homeScore: (f.HomeScore as number) ?? (f.homeScore as number) ?? 0,
    awayScore: (f.AwayScore as number) ?? (f.awayScore as number) ?? 0,
    competition,
    startTime: startMs,
    venue: (f.Venue as string) || (f.venue as string) || "",
    round: (f.Round as string) || (f.round as string) || "",
    group: (f.Group as string) || (f.group as string) || "",
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const API_TOKEN = getApiToken(req);

  // ── Try real TxLINE API first ──────────────────────────────────────────────
  if (API_TOKEN) {
    for (const origin of TXLINE_ORIGINS) {
      const jwt = await getGuestJwt(origin);
      if (!jwt) continue;

      try {
        // Fetch ALL fixtures snapshot from TxLINE (no competition filter)
        const r = await fetch(`${origin}/api/fixtures/snapshot`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
            "X-Api-Token": API_TOKEN,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });

        if (!r.ok) continue;

        const rawData = await r.json();
        if (!Array.isArray(rawData) || rawData.length === 0) continue;

        const now = Date.now();
        // Exclude matches that finished more than 4 hours ago
        const threeHoursAgo = now - 4 * 60 * 60 * 1000;

        // Deduplicate by fixtureId before any further processing
        const seenIds = new Set<number>();
        const data = rawData
          .map((f: Record<string, unknown>) => normalizeTxLineFixture(f, now))
          .filter((f) => {
            if (seenIds.has(f.fixtureId)) return false;
            seenIds.add(f.fixtureId);
            return true;
          })
          .filter((f) => {
            // Keep: live, upcoming, and recently finished (within 3h)
            if (f.status === "FT" && f.startTime < threeHoursAgo) return false;
            return true;
          })
          .sort((a, b) => {
            // WC matches always first
            const aWC = isWC(a.competition) ? 0 : 1;
            const bWC = isWC(b.competition) ? 0 : 1;
            if (aWC !== bWC) return aWC - bWC;
            // Within same tier: LIVE → upcoming → recent FT
            return sortKey(a.status, a.startTime, now) - sortKey(b.status, b.startTime, now);
          });

        if (data.length > 0) {
          // MERGE: Add demo WC knockout fixtures that TxLINE no longer has
          // (finished matches drop off TxLINE's snapshot)
          const demoFixtures = getDemoFixtures();
          const liveIds = new Set(data.map((f) => f.fixtureId));
          const pastWC = demoFixtures.filter(
            (f) => isWC(f.competition) && f.status === "FT" && !liveIds.has(f.fixtureId)
          );
          const merged = [...data, ...pastWC].sort((a, b) => {
            const aWC = isWC(a.competition) ? 0 : 1;
            const bWC = isWC(b.competition) ? 0 : 1;
            if (aWC !== bWC) return aWC - bWC;
            return sortKey(a.status, a.startTime, Date.now()) - sortKey(b.status, b.startTime, Date.now());
          });

          return NextResponse.json({
            success: true,
            data: merged,
            source: "txline_live",
            count: merged.length,
            origin,
          });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[fixtures] TxLINE error:", msg.slice(0, 120));
        continue;
      }
    }
  }

  // ── Fallback: multi-competition demo schedule ──────────────────────────────
  const data = getDemoFixtures();
  const note = API_TOKEN
    ? "TxLINE token present but returned no fixtures. Showing demo schedule."
    : "No TXLINE_API_TOKEN set — showing demo schedule. Visit /activate to connect live feeds.";

  return NextResponse.json({
    success: true,
    data,
    source: "schedule",
    note,
    count: data.length,
  });
}