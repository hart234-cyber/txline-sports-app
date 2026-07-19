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
  let prevSeqMax = -1;
  let seq = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
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
          // 1. Get fixture info
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

          // 2. Get scores/snapshot — has Stats, Actions, Clock
          const scoresR = await fetch(`${origin}/api/scores/snapshot/${fid}`, {
            headers, cache: "no-store", signal: AbortSignal.timeout(10000),
          });

          let homeScore = 0, awayScore = 0;
          let minute = 0;
          let cornersHome = 0, cornersAway = 0;
          let yellowsHome = 0, yellowsAway = 0;
          let redsHome = 0, redsAway = 0;
          let matchStatus = "Scheduled";
          const newEvents: Array<{ type: string; detail: string; minute: number; participant: number }> = [];

          if (scoresR.ok) {
            const scoresText = await scoresR.text();
            let records: Array<Record<string, unknown>> = [];
            try { records = JSON.parse(scoresText); } catch {
              for (const line of scoresText.split("\n")) {
                if (line.startsWith("data: ")) {
                  try { records.push(JSON.parse(line.slice(6))); } catch {}
                }
              }
            }

            // Track the highest seq we've seen
            let maxSeq = prevSeqMax;

            for (const rec of records) {
              const recSeq = (rec.Seq as number) ?? -1;
              const stats = (rec.Stats || {}) as Record<string, number>;
              const action = (rec.Action as string) || "";
              const clock = (rec.Clock || {}) as Record<string, unknown>;
              const clockSecs = (clock.Seconds as number) || 0;
              const recMinute = Math.floor(clockSecs / 60);
              const participant = (rec.Participant as number) || 0;
              const data = (rec.Data || {}) as Record<string, unknown>;
              const confirmed = rec.Confirmed as boolean;
              const statusData = data.StatusId as number;

              // Update match minute from Clock (more accurate than StartTime calc)
              if (clockSecs > 0 && recMinute > minute) minute = recMinute;

              // Update stats from latest record that has them
              if (stats[1] !== undefined) homeScore = stats[1];
              if (stats[2] !== undefined) awayScore = stats[2];
              if (stats[3] !== undefined) yellowsHome = stats[3];
              if (stats[4] !== undefined) yellowsAway = stats[4];
              if (stats[5] !== undefined) redsHome = stats[5];
              if (stats[6] !== undefined) redsAway = stats[6];
              if (stats[7] !== undefined) cornersHome = stats[7];
              if (stats[8] !== undefined) cornersAway = stats[8];

              // Detect match status from StatusId
              if (statusData === 2) matchStatus = "1H";
              else if (statusData === 3) matchStatus = "HT";
              else if (statusData === 4) matchStatus = "2H";
              else if (statusData === 5) matchStatus = "FT";

              // Only emit NEW events (seq > prevSeqMax) and confirmed ones
              if (recSeq > prevSeqMax && confirmed) {
                const teamName = participant === 1 ? home : participant === 2 ? away : "";
                
                if (action === "goal") {
                  newEvents.push({ type: "goal", detail: `Goal! ${teamName} scores!`, minute: recMinute, participant });
                } else if (action === "shot") {
                  const outcome = (data.Outcome as string) || "";
                  newEvents.push({ type: "shot", detail: `Shot ${outcome} — ${teamName}`, minute: recMinute, participant });
                } else if (action === "corner") {
                  newEvents.push({ type: "corner", detail: `Corner kick — ${teamName}`, minute: recMinute, participant });
                } else if (action === "free_kick") {
                  const fkType = (data.FreeKickType as string) || "";
                  if (fkType === "Offside") {
                    newEvents.push({ type: "offside", detail: `Offside — ${teamName}`, minute: recMinute, participant });
                  } else {
                    newEvents.push({ type: "foul", detail: `Free kick (${fkType}) — ${teamName}`, minute: recMinute, participant });
                  }
                } else if (action === "yellow_card") {
                  newEvents.push({ type: "yellowCard", detail: `Yellow card — ${teamName}`, minute: recMinute, participant });
                } else if (action === "red_card") {
                  newEvents.push({ type: "redCard", detail: `Red card — ${teamName}`, minute: recMinute, participant });
                } else if (action === "substitution") {
                  newEvents.push({ type: "substitution", detail: `Substitution — ${teamName}`, minute: recMinute, participant });
                } else if (action === "penalty") {
                  newEvents.push({ type: "penalty", detail: `Penalty — ${teamName}`, minute: recMinute, participant });
                } else if (action === "var") {
                  const varType = (data.Type as string) || "";
                  newEvents.push({ type: "var", detail: `VAR check (${varType}) — ${teamName}`, minute: recMinute, participant });
                } else if (action === "throw_in") {
                  newEvents.push({ type: "throw_in", detail: `Throw-in — ${teamName}`, minute: recMinute, participant });
                } else if (action === "kickoff") {
                  newEvents.push({ type: "kickoff", detail: `Kick off!`, minute: 0, participant: 0 });
                }
              }

              if (recSeq > maxSeq) maxSeq = recSeq;
            }

            prevSeqMax = maxSeq;
          }

          // Fallback minute from StartTime if Clock didn't give us one
          if (minute === 0) {
            const rawSt = typeof target.StartTime === "number" ? target.StartTime : 0;
            const startMs = rawSt > 1e12 ? rawSt : rawSt > 0 ? rawSt * 1000 : 0;
            const msSince = Date.now() - startMs;
            if (startMs > 0 && msSince > 0) minute = Math.min(120, Math.floor(msSince / 60000));
          }

          // Detect goal from score change
          if (prevHomeScore >= 0 && homeScore > prevHomeScore) {
            if (!newEvents.some(e => e.type === "goal")) {
              newEvents.push({ type: "goal", detail: `Goal! ${home} scores! ${homeScore}-${awayScore}`, minute, participant: 1 });
            }
          }
          if (prevAwayScore >= 0 && awayScore > prevAwayScore) {
            if (!newEvents.some(e => e.type === "goal")) {
              newEvents.push({ type: "goal", detail: `Goal! ${away} scores! ${homeScore}-${awayScore}`, minute, participant: 2 });
            }
          }

          prevHomeScore = homeScore;
          prevAwayScore = awayScore;
          prevCorners = { home: cornersHome, away: cornersAway };
          prevYellows = { home: yellowsHome, away: yellowsAway };
          prevReds = { home: redsHome, away: redsAway };

          seq++;

          const eventType = newEvents.some(e => e.type === "goal") ? "goal" : "tick";
          const payload = JSON.stringify({
            type: eventType,
            demo: false,
            seq,
            fixtureId: fid,
            home, homeCode, away, awayCode,
            homeScore, awayScore,
            minute,
            status: matchStatus,
            scorer: null,
            stats: {
              cornersHome, cornersAway,
              yellowsHome, yellowsAway,
              redsHome, redsAway,
              possessionHome: null, possessionAway: null,
              shotsHome: null, shotsAway: null,
              shotsOnTargetHome: null, shotsOnTargetAway: null,
              foulsHome: null, foulsAway: null,
            },
            events: newEvents,
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
