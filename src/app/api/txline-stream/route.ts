export const runtime = "nodejs";

/**
 * TxLINE SSE Stream — /api/txline-stream
 *
 * When a real API token is present:
 *   - Polls /api/fixtures/snapshot every 30s for live scores + stats
 *   - Emits "connected" immediately (so banner shows "TxLINE API Active")
 *   - Emits "goal" when homeScore or awayScore increases
 *   - Emits "tick" with full stats on every poll
 *   - Emits rich match events (fouls, cards, penalties, subs) from TxLINE data
 *
 * When no token is set (demo mode):
 *   - Emits realistic demo events including stats, goals with scorer names,
 *     fouls, cards, penalties, and substitutions
 *   - Only emits goal events when fixtureStatus is live (not Scheduled)
 *
 * Query params:
 *   fixtureId     — target fixture ID
 *   fixtureStatus — current status (Scheduled, 1H, HT, 2H, FT)
 *   token         — API token (EventSource can't send headers)
 */

const TXLINE_ORIGINS = [
  "https://txline-dev.txodds.com",  // devnet FIRST
  "https://txline.txodds.com",       // mainnet fallback
];

function getApiToken(req: Request): string {
  const env = process.env.TXLINE_API_TOKEN || "";
  if (env && !env.startsWith("demo_") && !env.includes("paste")) return env;
  const url = new URL(req.url);
  const qToken = url.searchParams.get("token") || "";
  if (qToken && !qToken.startsWith("demo_") && !qToken.includes("paste")) return qToken;
  return req.headers.get("x-txline-token") || "";
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

// ── Player name pools for realistic demo events ──────────────────────────────
const PLAYER_POOLS: Record<string, string[]> = {
  FRA: ["Mbappé", "Dembélé", "Olise", "Barcola", "Rabiot", "Zaïre-Emery", "Cherki", "Doué", "Hernandez", "Konaté", "Maignan", "Gusto", "Lacroix"],
  ENG: ["Saka", "Rice", "Bellingham", "Konsa", "Rashford", "Toney", "Eze", "Rogers", "Spence", "Guehi", "Quansah", "Henderson"],
  ESP: ["Yamal", "Pedri", "Morata", "Rodri", "Carvajal", "Cucurella", "Laporte", "Unai Simón", "Olmo", "Ferran Torres", "Gavi", "Nico Williams"],
  ARG: ["Messi", "Di María", "Álvarez", "De Paul", "Mac Allister", "Molina", "Romero", "Otamendi", "Martínez", "Dybala", "Lautaro"],
  BRA: ["Vinicius Jr", "Rodrygo", "Neymar", "Casemiro", "Militão", "Marquinhos", "Alisson", "Raphinha", "Paquetá", "Endrick"],
  GER: ["Müller", "Gnabry", "Havertz", "Kimmich", "Goretzka", "Rüdiger", "Süle", "Neuer", "Wirtz", "Musiala"],
  DEFAULT: ["Player A", "Player B", "Player C", "Player D", "Player E"],
};

function getPlayer(teamCode: string): string {
  const pool = PLAYER_POOLS[teamCode] || PLAYER_POOLS.DEFAULT;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Demo stream fixtures ──────────────────────────────────────────────────────
const DEMO_FIXTURES = [
  { fixtureId: 2626003, home: "England", homeCode: "ENG", away: "France", awayCode: "FRA" },
  { fixtureId: 2626004, home: "Spain", homeCode: "ESP", away: "Argentina", awayCode: "ARG" },
];

// ── Demo stream ───────────────────────────────────────────────────────────────
function makeDemoStream(fixtureId: string | null, fixtureStatus?: string | null): ReadableStream {
  const encoder = new TextEncoder();

  const LIVE_STATUSES = new Set(["LIVE", "1H", "2H", "HT", "live", "1h", "2h", "ht"]);
  const fixtureIsLive = fixtureStatus ? LIVE_STATUSES.has(fixtureStatus) : false;

  const demoFixture =
    DEMO_FIXTURES.find((f) => String(f.fixtureId) === fixtureId) || DEMO_FIXTURES[0];

  let seq = 0;
  let homeScore = 0;
  let awayScore = 0;
  let minute = 1;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Simulated stats that grow realistically
  const stats = {
    possessionHome: 50, possessionAway: 50,
    shotsHome: 0, shotsAway: 0,
    shotsOnTargetHome: 0, shotsOnTargetAway: 0,
    cornersHome: 0, cornersAway: 0,
    foulsHome: 0, foulsAway: 0,
  };

  // Event type rotation for rich demo feed
  const EVENT_TYPES = ["tick", "tick", "tick", "foul", "tick", "corner", "tick", "tick", "yellowCard", "tick", "tick", "tick"];
  let eventRotation = 0;

  return new ReadableStream({
    start(controller) {
      const connected = JSON.stringify({
        type: "connected",
        demo: true,
        message: "Demo mode — set TXLINE_API_TOKEN in .env.local for live data",
        fixtureId: demoFixture.fixtureId,
        home: demoFixture.home,
        away: demoFixture.away,
      });
      controller.enqueue(
        encoder.encode(`id: init\nevent: connected\ndata: ${connected}\n\n`)
      );

      intervalId = setInterval(() => {
        seq++;
        minute = Math.min(90, minute + Math.floor(Math.random() * 3) + 1);

        // Update stats realistically
        if (Math.random() > 0.5) stats.shotsHome++;
        if (Math.random() > 0.6) stats.shotsAway++;
        if (Math.random() > 0.7) stats.shotsOnTargetHome = Math.min(stats.shotsHome, stats.shotsOnTargetHome + 1);
        if (Math.random() > 0.75) stats.shotsOnTargetAway = Math.min(stats.shotsAway, stats.shotsOnTargetAway + 1);
        if (Math.random() > 0.8) stats.cornersHome++;
        if (Math.random() > 0.82) stats.cornersAway++;
        if (Math.random() > 0.75) stats.foulsHome++;
        if (Math.random() > 0.78) stats.foulsAway++;
        // Possession drifts
        const drift = Math.floor((Math.random() - 0.5) * 4);
        stats.possessionHome = Math.max(30, Math.min(70, stats.possessionHome + drift));
        stats.possessionAway = 100 - stats.possessionHome;

        // Determine event type
        const goalChance = Math.random();
        let eventType = "tick";
        let scorer: string | null = null;
        let player: string | null = null;
        let team: string | null = null;
        let subOn: string | null = null;
        let subOff: string | null = null;

        if (fixtureIsLive && goalChance < 0.10) {
          // GOAL
          eventType = "goal";
          const homeScores = Math.random() > 0.5;
          if (homeScores) {
            homeScore++;
            scorer = getPlayer(demoFixture.homeCode);
            team = demoFixture.home;
          } else {
            awayScore++;
            scorer = getPlayer(demoFixture.awayCode);
            team = demoFixture.away;
          }
        } else if (fixtureIsLive && goalChance < 0.14) {
          // PENALTY
          eventType = "penalty";
          const homeTeam = Math.random() > 0.5;
          player = getPlayer(homeTeam ? demoFixture.homeCode : demoFixture.awayCode);
          team = homeTeam ? demoFixture.home : demoFixture.away;
        } else if (fixtureIsLive && goalChance < 0.18 && minute > 45) {
          // SUBSTITUTION (only after 45')
          eventType = "substitution";
          const homeTeam = Math.random() > 0.5;
          subOn = getPlayer(homeTeam ? demoFixture.homeCode : demoFixture.awayCode);
          subOff = getPlayer(homeTeam ? demoFixture.homeCode : demoFixture.awayCode);
          team = homeTeam ? demoFixture.home : demoFixture.away;
        } else {
          // Rotate through foul/corner/yellowCard/tick
          const rotated = EVENT_TYPES[eventRotation % EVENT_TYPES.length];
          eventRotation++;
          if (fixtureIsLive) {
            eventType = rotated;
            const homeTeam = Math.random() > 0.5;
            player = getPlayer(homeTeam ? demoFixture.homeCode : demoFixture.awayCode);
            team = homeTeam ? demoFixture.home : demoFixture.away;
          }
        }

        const payload = JSON.stringify({
          type: eventType,
          demo: true,
          seq,
          fixtureId: demoFixture.fixtureId,
          home: demoFixture.home,
          homeCode: demoFixture.homeCode,
          away: demoFixture.away,
          awayCode: demoFixture.awayCode,
          homeScore,
          awayScore,
          minute,
          scorer,
          player,
          team,
          subOn,
          subOff,
          stats: { ...stats },
          ts: Date.now(),
        });

        try {
          controller.enqueue(
            encoder.encode(
              `id: ${Date.now()}:${seq}\nevent: ${eventType}\ndata: ${payload}\n\n`
            )
          );
        } catch {
          if (intervalId) clearInterval(intervalId);
        }
      }, 15000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });
}

// ── Polling stream (real token, devnet SSE is silent) ─────────────────────────
function makePollingStream(
  origin: string,
  jwt: string,
  apiToken: string,
  fixtureId: string | null
): ReadableStream {
  const encoder = new TextEncoder();
  let prevHomeScore = -1;
  let prevAwayScore = -1;
  let prevSeq = -1;
  let seq = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  // Track previous stats to detect changes
  let prevCorners = { home: 0, away: 0 };
  let prevYellows = { home: 0, away: 0 };
  let prevReds = { home: 0, away: 0 };

  const headers = {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
  };

  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `id: init\nevent: connected\ndata: ${JSON.stringify({ type: "connected", demo: false, live: true })}\n\n`
        )
      );

      async function poll() {
        try {
          // 1. Get fixture info (for team names and GameState)
          const fixR = await fetch(`${origin}/api/fixtures/snapshot`, {
            headers, cache: "no-store", signal: AbortSignal.timeout(10000),
          });
          if (!fixR.ok) return;
          const rawFixtures = await fixR.json();
          if (!Array.isArray(rawFixtures) || rawFixtures.length === 0) return;

          const target = fixtureId
            ? rawFixtures.find((f: Record<string, unknown>) => String(f.FixtureId ?? f.fixtureId) === fixtureId)
            : rawFixtures[0];
          if (!target) return;

          const fid = target.FixtureId ?? target.fixtureId;
          const home = (target.Participant1 as string) || "Home";
          const away = (target.Participant2 as string) || "Away";
          const homeCode = home.slice(0, 3).toUpperCase();
          const awayCode = away.slice(0, 3).toUpperCase();

          // 2. Get scores/snapshot for this fixture — this has Stats and Actions
          const scoresR = await fetch(`${origin}/api/scores/snapshot/${fid}`, {
            headers, cache: "no-store", signal: AbortSignal.timeout(10000),
          });

          let homeScore = 0, awayScore = 0;
          let gameState = "scheduled";
          let cornersHome = 0, cornersAway = 0;
          let yellowsHome = 0, yellowsAway = 0;
          let redsHome = 0, redsAway = 0;
          let lastAction = "";
          let actionData: Record<string, unknown> = {};

          if (scoresR.ok) {
            const scoresText = await scoresR.text();
            // scores/snapshot can return JSON array or SSE format
            let records: Array<Record<string, unknown>> = [];
            try {
              records = JSON.parse(scoresText);
            } catch {
              // Parse SSE format: data: {...}\nevent: scores
              const lines = scoresText.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try { records.push(JSON.parse(line.slice(6))); } catch {}
                }
              }
            }

            // Process all score records — latest ones have the most up-to-date stats
            for (const rec of records) {
              const gs = rec.GameState as string;
              if (gs) gameState = gs;

              const stats = (rec.Stats || {}) as Record<string, number>;
              // TxLINE stat keys: 1=P1 goals, 2=P2 goals, 3=P1 yellows, 4=P2 yellows,
              // 5=P1 reds, 6=P2 reds, 7=P1 corners, 8=P2 corners
              if (stats[1] !== undefined) homeScore = stats[1];
              if (stats[2] !== undefined) awayScore = stats[2];
              if (stats[3] !== undefined) yellowsHome = stats[3];
              if (stats[4] !== undefined) yellowsAway = stats[4];
              if (stats[5] !== undefined) redsHome = stats[5];
              if (stats[6] !== undefined) redsAway = stats[6];
              if (stats[7] !== undefined) cornersHome = stats[7];
              if (stats[8] !== undefined) cornersAway = stats[8];

              const action = rec.Action as string;
              if (action) lastAction = action;
              if (rec.Data && typeof rec.Data === "object") actionData = rec.Data as Record<string, unknown>;
            }
          }

          // Detect events by comparing with previous state
          const events: Array<{ type: string; detail: string }> = [];

          if (prevHomeScore >= 0 && homeScore > prevHomeScore) {
            events.push({ type: "goal", detail: `Goal! ${home} scores! ${homeScore}-${awayScore}` });
          }
          if (prevAwayScore >= 0 && awayScore > prevAwayScore) {
            events.push({ type: "goal", detail: `Goal! ${away} scores! ${homeScore}-${awayScore}` });
          }
          if (cornersHome > prevCorners.home) {
            events.push({ type: "corner", detail: `Corner kick — ${home}` });
          }
          if (cornersAway > prevCorners.away) {
            events.push({ type: "corner", detail: `Corner kick — ${away}` });
          }
          if (yellowsHome > prevYellows.home) {
            events.push({ type: "yellowCard", detail: `Yellow card — ${home}` });
          }
          if (yellowsAway > prevYellows.away) {
            events.push({ type: "yellowCard", detail: `Yellow card — ${away}` });
          }
          if (redsHome > prevReds.home) {
            events.push({ type: "redCard", detail: `Red card — ${home}` });
          }
          if (redsAway > prevReds.away) {
            events.push({ type: "redCard", detail: `Red card — ${away}` });
          }

          prevHomeScore = homeScore;
          prevAwayScore = awayScore;
          prevCorners = { home: cornersHome, away: cornersAway };
          prevYellows = { home: yellowsHome, away: yellowsAway };
          prevReds = { home: redsHome, away: redsAway };

          // Map TxLINE GameState to status
          const gsMap: Record<string, string> = {
            scheduled: "Scheduled", "1": "Scheduled",
            "2": "1H", "3": "HT", "4": "2H", "5": "FT",
            "6": "WET", "7": "ET1", "8": "HTET", "9": "ET2",
            "10": "FET", "11": "WPE", "12": "PEN", "13": "FPE",
          };
          const status = gsMap[String(gameState)] || String(gameState);

          // Compute match minute from StartTime
          const rawSt = typeof target.StartTime === "number" ? target.StartTime : 0;
          const startMs = rawSt > 1e12 ? rawSt : rawSt > 0 ? rawSt * 1000 : 0;
          const msSince = Date.now() - startMs;
          const minute = startMs > 0 && msSince > 0 ? Math.min(120, Math.floor(msSince / 60000)) : 0;

          seq++;

          // Emit main tick with all stats
          const eventType = events.some(e => e.type === "goal") ? "goal" : "tick";
          const payload = JSON.stringify({
            type: eventType,
            demo: false,
            seq,
            fixtureId: fid,
            home,
            homeCode,
            away,
            awayCode,
            homeScore,
            awayScore,
            minute,
            status,
            scorer: null, // TxLINE doesn't provide scorer names
            stats: {
              cornersHome, cornersAway,
              yellowsHome, yellowsAway,
              redsHome, redsAway,
              // TxLINE doesn't provide shots/possession in basic Stats — use null
              possessionHome: null, possessionAway: null,
              shotsHome: null, shotsAway: null,
              shotsOnTargetHome: null, shotsOnTargetAway: null,
              foulsHome: null, foulsAway: null,
            },
            events,
            lastAction,
            ts: Date.now(),
          });

          try {
            controller.enqueue(
              encoder.encode(
                `id: ${Date.now()}:${seq}\nevent: ${eventType}\ndata: ${payload}\n\n`
              )
            );
          } catch {
            if (intervalId) clearInterval(intervalId);
          }
        } catch (e) {
          console.error("[polling-stream] poll error:", e instanceof Error ? e.message : String(e));
        }
      }

      // First poll immediately
      poll();
      intervalId = setInterval(poll, 30000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fixtureId = searchParams.get("fixtureId");
  const fixtureStatus = searchParams.get("fixtureStatus");
  const API_TOKEN = getApiToken(req);

  // ── Try real TxLINE: use polling stream (devnet SSE is silent) ──────────────
  if (API_TOKEN) {
    for (const origin of TXLINE_ORIGINS) {
      const jwt = await getGuestJwt(origin);
      if (!jwt) continue;

      // Verify the token works against this origin before committing to it
      try {
        const testR = await fetch(`${origin}/api/fixtures/snapshot`, {
          headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": API_TOKEN },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (!testR.ok) continue;

        // Token works — use polling stream
        return new Response(makePollingStream(origin, jwt, API_TOKEN, fixtureId), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Txline-Source": "polling",
            "X-Txline-Origin": origin,
          },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[txline-stream] origin error:", msg.slice(0, 120));
        continue;
      }
    }
  }

  // ── Fallback: rich demo stream ───────────────────────────────────────────────
  return new Response(makeDemoStream(fixtureId, fixtureStatus), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Txline-Source": "demo",
    },
  });
}
