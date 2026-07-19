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
  FRA: ["Mbappé", "Griezmann", "Dembélé", "Camavinga", "Tchouaméni", "Saliba", "Hernandez", "Upamecano", "Maignan", "Giroud", "Thuram"],
  ENG: ["Kane", "Bellingham", "Saka", "Foden", "Rice", "Trippier", "Walker", "Stones", "Pickford", "Rashford", "Gordon"],
  ESP: ["Yamal", "Pedri", "Morata", "Rodri", "Carvajal", "Alba", "Laporte", "Unai Simón", "Olmo", "Ferran Torres", "Gavi"],
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
  { fixtureId: 2626003, home: "France", homeCode: "FRA", away: "England", awayCode: "ENG" },
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
  let seq = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream({
    start(controller) {
      // Emit connected immediately so banner shows "TxLINE API Active"
      controller.enqueue(
        encoder.encode(
          `id: init\nevent: connected\ndata: ${JSON.stringify({ type: "connected", demo: false, live: true })}\n\n`
        )
      );

      async function poll() {
        try {
          const url = `${origin}/api/fixtures/snapshot`;
          const r = await fetch(url, {
            headers: {
              Authorization: `Bearer ${jwt}`,
              "X-Api-Token": apiToken,
            },
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          });
          if (!r.ok) return;

          const rawFixtures = await r.json();
          if (!Array.isArray(rawFixtures) || rawFixtures.length === 0) return;

          // Find the target fixture
          const now = Date.now();
          let target = fixtureId
            ? rawFixtures.find(
                (f: Record<string, unknown>) =>
                  String(f.FixtureId ?? f.fixtureId ?? f.id) === fixtureId
              )
            : null;

          // Fallback: first live fixture
          if (!target) {
            target = rawFixtures.find((f: Record<string, unknown>) => {
              const gs = typeof f.GameState === "number" ? f.GameState : null;
              const rawSt = typeof f.StartTime === "number" ? f.StartTime : 0;
              const startMs = rawSt > 1e12 ? rawSt : rawSt > 0 ? rawSt * 1000 : 0;
              const msSince = now - startMs;
              const isLive = msSince > 0 && msSince < 7200000;
              return gs === 2 || gs === 3 || gs === 4 || gs === 5 || isLive;
            }) || rawFixtures[0];
          }

          if (!target) return;

          const homeScore = (target.HomeScore as number) ?? (target.homeScore as number) ?? 0;
          const awayScore = (target.AwayScore as number) ?? (target.awayScore as number) ?? 0;

          // Extract stats from TxLINE response
          const rawStats = (target.Statistics ?? target.statistics ?? target.stats ?? {}) as Record<string, unknown>;
          const stats = {
            possessionHome: (rawStats.possession_home ?? rawStats.possessionHome ?? rawStats.Possession1 ?? null) as number | null,
            possessionAway: (rawStats.possession_away ?? rawStats.possessionAway ?? rawStats.Possession2 ?? null) as number | null,
            shotsHome: (rawStats.shots_home ?? rawStats.shotsHome ?? rawStats.Shots1 ?? rawStats.total_shots_home ?? null) as number | null,
            shotsAway: (rawStats.shots_away ?? rawStats.shotsAway ?? rawStats.Shots2 ?? rawStats.total_shots_away ?? null) as number | null,
            shotsOnTargetHome: (rawStats.shots_on_target_home ?? rawStats.shotsOnTargetHome ?? rawStats.ShotsOnTarget1 ?? null) as number | null,
            shotsOnTargetAway: (rawStats.shots_on_target_away ?? rawStats.shotsOnTargetAway ?? rawStats.ShotsOnTarget2 ?? null) as number | null,
            cornersHome: (rawStats.corners_home ?? rawStats.cornersHome ?? rawStats.Corners1 ?? null) as number | null,
            cornersAway: (rawStats.corners_away ?? rawStats.cornersAway ?? rawStats.Corners2 ?? null) as number | null,
            foulsHome: (rawStats.fouls_home ?? rawStats.foulsHome ?? rawStats.Fouls1 ?? null) as number | null,
            foulsAway: (rawStats.fouls_away ?? rawStats.foulsAway ?? rawStats.Fouls2 ?? null) as number | null,
          };

          // Extract match events from TxLINE response
          const events = (target.Events ?? target.events ?? target.MatchEvents ?? []) as Array<Record<string, unknown>>;

          const isGoal =
            prevHomeScore >= 0 &&
            (homeScore > prevHomeScore || awayScore > prevAwayScore);

          const eventType = isGoal ? "goal" : "tick";

          // Determine scorer from events if available
          let scorer: string | null = null;
          if (isGoal && events.length > 0) {
            const goalEvent = [...events].reverse().find(
              (ev) =>
                String(ev.Type ?? ev.type ?? ev.EventType ?? "").toLowerCase().includes("goal") ||
                (ev.TypeId ?? ev.typeId) === 1
            );
            if (goalEvent) {
              scorer =
                (goalEvent.PlayerName as string) ??
                (goalEvent.player_name as string) ??
                (goalEvent.Player as string) ??
                null;
            }
          }

          // Compute match minute
          const rawSt = typeof target.StartTime === "number" ? target.StartTime : 0;
          const startMs = rawSt > 1e12 ? rawSt : rawSt > 0 ? rawSt * 1000 : 0;
          const msSince = Date.now() - startMs;
          const minute = startMs > 0 && msSince > 0 ? Math.min(90, Math.floor(msSince / 60000)) : 0;

          prevHomeScore = homeScore;
          prevAwayScore = awayScore;
          seq++;

          const payload = JSON.stringify({
            type: eventType,
            demo: false,
            seq,
            fixtureId: target.FixtureId ?? target.fixtureId ?? target.id,
            home: target.Participant1 ?? target.home ?? "Home",
            homeCode: ((target.Participant1 as string) ?? "HOM").slice(0, 3).toUpperCase(),
            away: target.Participant2 ?? target.away ?? "Away",
            awayCode: ((target.Participant2 as string) ?? "AWY").slice(0, 3).toUpperCase(),
            homeScore,
            awayScore,
            minute,
            scorer,
            stats,
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
