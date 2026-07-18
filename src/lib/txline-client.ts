// TxLINE World Cup Data Client – Devnet Free Tier
// StreakLINE v3 – Neo-Football

export const NETWORK = "devnet";
export const API_ORIGIN = process.env.TXLINE_API_ORIGIN || "https://txline-dev.txodds.com";
export const API_BASE = `${API_ORIGIN}/api`;

export type Fixture = {
  fixtureId: number;
  home: string;
  away: string;
  homeCode?: string;
  awayCode?: string;
  status?: string;
  minute?: number;
  competition?: string;
  homeScore?: number;
  awayScore?: number;
  startTime?: number;
  venue?: string;
  group?: string;
  round?: string;
};

export type StatKey = "corners" | "shots" | "shots_on_target" | "possession_home" | "fouls" | "attacks";

export const STATS: { key: StatKey; label: string; unit: string; short: string }[] = [
  { key: "corners", label: "Corners", unit: "", short: "CRN" },
  { key: "shots", label: "Shots", unit: "", short: "SHT" },
  { key: "shots_on_target", label: "Shots on target", unit: "", short: "SOT" },
  { key: "possession_home", label: "Possession", unit: "%", short: "POS" },
  { key: "fouls", label: "Fouls", unit: "", short: "FLS" },
  { key: "attacks", label: "Dangerous attacks", unit: "", short: "ATK" },
];

export type LiveEvent = {
  time: string;
  text: string;
  icon: string;
  type: "goal" | "card" | "corner" | "var" | "save" | "fk" | "ht" | "kickoff" | "tick";
};

export type LiveStats = {
  possessionHome?: number;
  possessionAway?: number;
  shotsHome?: number;
  shotsAway?: number;
  shotsOnTargetHome?: number;
  shotsOnTargetAway?: number;
  cornersHome?: number;
  cornersAway?: number;
  foulsHome?: number;
  foulsAway?: number;
};

// Country codes – used for flag SVGs (via flagcdn.com) – no emoji, professional
export function countryCode(name: string, fallback?: string): string {
  const n = (fallback || name).toUpperCase();
  const map: Record<string, string> = {
    ARGENTINA: "AR", FRANCE: "FR", BRAZIL: "BR", GERMANY: "DE",
    SPAIN: "ES", ENGLAND: "GB-ENG", "UNITED STATES": "US",
    PORTUGAL: "PT", NETHERLANDS: "NL", BELGIUM: "BE", CROATIA: "HR",
    MOROCCO: "MA", JAPAN: "JP", MEXICO: "MX", SENEGAL: "SN",
    NIGERIA: "NG", URUGUAY: "UY", COLOMBIA: "CO", ITALY: "IT",
    CANADA: "CA", KOREA: "KR", AUSTRALIA: "AU", SWITZERLAND: "CH", DENMARK: "DK",
    ARG: "AR", FRA: "FR", BRA: "BR", GER: "DE", ESP: "ES", ENG: "GB-ENG",
    USA: "US", POR: "PT", NED: "NL", BEL: "BE", CRO: "HR", MAR: "MA",
    JPN: "JP", MEX: "MX", SEN: "SN", NGA: "NG", URU: "UY", COL: "CO",
    VIETNAM: "VN", MYANMAR: "MM", "NEW ZEALAND": "NZ", INDIA: "IN",
    VIE: "VN", MYA: "MM", NZL: "NZ", IND: "IN", AUS: "AU",
  };
  return map[n] || (n.length === 2 ? n : "UN");
}

// flagcdn – crisp SVG flags, professional, no emoji rendering issues
export function flagUrl(countryCodeStr: string, size: 20|40|80 = 40): string {
  const c = countryCode(countryCodeStr).toLowerCase().split("-")[0];
  const w = size === 20 ? 20 : size === 80 ? 80 : 40;
  return `https://flagcdn.com/w${w}/${c}.png`;
}

export async function fetchFixtures(): Promise<{fixtures: Fixture[], source: "txline_live"|"txline_replay"|"demo"}> {
  try {
    // Pass API token from localStorage to server (server can't read localStorage)
    let token = typeof window !== "undefined" ? localStorage.getItem("txline_permanent_token") || "" : "";
    if (token.startsWith("{")) {
      try {
        const parsed = JSON.parse(token);
        token = parsed.token || parsed.apiToken || token;
      } catch {}
    }
    const params = token && !token.startsWith("demo_") ? `?token=${encodeURIComponent(token)}` : "";
    const r = await fetch(`/api/fixtures${params}`, { cache: "no-store" });
    const j = await r.json();
    const fixtures: Fixture[] = (j.data || []).map((f: any, index: number) => {
      const home = f.home || f.Participant1 || f.participant1?.name || f.p1 || "Home";
      const away = f.away || f.Participant2 || f.participant2?.name || f.p2 || "Away";
      const homeCode = f.homeCode || home.slice(0,3).toUpperCase();
      const awayCode = f.awayCode || away.slice(0,3).toUpperCase();
      return {
        fixtureId: f.fixtureId ?? f.FixtureId ?? f.id ?? (index + 1),
        home, away, homeCode, awayCode,
        status: f.status || (f.GameState === 1 ? "Scheduled" : "LIVE"),
        minute: f.minute ?? 0,
        homeScore: f.homeScore ?? 0,
        awayScore: f.awayScore ?? 0,
        competition: f.competition || f.Competition || "FIFA World Cup 2026",
      };
    });
    return { fixtures, source: (j.source || "demo") as any };
  } catch {
    return { fixtures: [], source: "demo" };
  }
}

// Historical replay sequences – realistic TxLINE stat progression
const REPLAY_SEQUENCES: Record<StatKey, number[]> = {
  corners:        [1,1,2,2,3,4,4,5,6,7,8,9,10],
  shots:          [2,3,4,5,6,8,9,11,13,14,16,18],
  shots_on_target:[0,1,1,2,2,3,4,4,5,6,6],
  possession_home:[53,52,51,50,49,51,50,48,49,47,48],
  fouls:          [1,2,3,4,5,6,7,9,10,12,13,15],
  attacks:        [3,5,7,9,12,15,18,21,24,27,31],
};

export function getReplayValue(stat: StatKey, step: number): number {
  const seq = REPLAY_SEQUENCES[stat];
  return seq[Math.min(step, seq.length - 1)] ?? seq[seq.length - 1];
}

// Generate a fake but plausible odds sparkline for the UI
// In production: read from /api/odds/snapshot/{fixtureId}
export function getOddsSpark(stat: StatKey, step: number): number[] {
  const base = { corners: 62, shots: 57, shots_on_target: 60, possession_home: 52, fouls: 54, attacks: 65 }[stat] ?? 58;
  const pts: number[] = [];
  let v = base;
  for (let i = 0; i < 18; i++) {
    v += (Math.random() - 0.48) * 4.5;
    v = Math.max(38, Math.min(78, v));
    pts.push(Math.round(v * 10) / 10);
  }
  // nudge toward current step direction
  return pts;
}

export function extractStatFromTxlineScore(scorePayload: any, stat: StatKey): number | null {
  try {
    const s = scorePayload?.statistics || scorePayload?.stats || scorePayload;
    const map: Record<StatKey, string[]> = {
      corners: ["corners", "corner_kicks"],
      shots: ["shots", "total_shots"],
      shots_on_target: ["shots_on_target", "shotsOnTarget"],
      possession_home: ["possession_home", "possession", "possession_pct_home"],
      fouls: ["fouls", "total_fouls"],
      attacks: ["dangerous_attacks", "attacks"],
    };
    for (const k of map[stat]) if (typeof s?.[k] === "number") return s[k];
  } catch {}
  return null;
}