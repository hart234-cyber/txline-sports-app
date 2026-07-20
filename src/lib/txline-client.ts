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
  yellowsHome?: number;
  yellowsAway?: number;
  redsHome?: number;
  redsAway?: number;
};

// Country codes – used for flag SVGs (via flagcdn.com) – no emoji, professional
export function countryCode(name: string, fallback?: string): string {
  const n = (fallback || name).toUpperCase();
  const map: Record<string, string> = {
    ARGENTINA: "AR", FRANCE: "FR", BRAZIL: "BR", GERMANY: "DE",
    SPAIN: "ES", ENGLAND: "GB-ENG", "UNITED STATES": "US", USA: "US",
    PORTUGAL: "PT", NETHERLANDS: "NL", BELGIUM: "BE", CROATIA: "HR",
    MOROCCO: "MA", JAPAN: "JP", MEXICO: "MX", SENEGAL: "SN",
    NIGERIA: "NG", URUGUAY: "UY", COLOMBIA: "CO", ITALY: "IT",
    CANADA: "CA", KOREA: "KR", AUSTRALIA: "AU", SWITZERLAND: "CH", DENMARK: "DK",
    CHILE: "CL", PERU: "PE", ECUADOR: "EC", PARAGUAY: "PY", BOLIVIA: "BO",
    VENEZUELA: "VE", PANAMA: "PA", COSTA_RICA: "CR", "COSTA RICA": "CR",
    HONDURAS: "HN", GUATEMALA: "GT", JAMAICA: "JM", TRINIDAD: "TT",
    WALES: "GB-WLS", SCOTLAND: "GB-SCT", "NORTHERN IRELAND": "GB-NIR",
    IRELAND: "IE", AUSTRIA: "AT", SWEDEN: "SE", NORWAY: "NO", FINLAND: "FI",
    POLAND: "PL", CZECHIA: "CZ", SLOVAKIA: "SK", HUNGARY: "HU", ROMANIA: "RO",
    SERBIA: "RS", UKRAINE: "UA", RUSSIA: "RU", TURKEY: "TR", GREECE: "GR",
    LIECHTENSTEIN: "LI", GIBRALTAR: "GI", "NEW ZEALAND": "NZ", INDIA: "IN",
    VIETNAM: "VN", MYANMAR: "MM", INDONESIA: "ID", THAILAND: "TH",
    CHINA: "CN", "SOUTH KOREA": "KR", "NORTH KOREA": "KP",
    CAMEROON: "CM", GHANA: "GH", "IVORY COAST": "CI", EGYPT: "EG",
    ALGERIA: "DZ", TUNISIA: "TN", KENYA: "KE", ETHIOPIA: "ET",
    "SAUDI ARABIA": "SA", IRAN: "IR", IRAQ: "IQ", UAE: "AE",
    QATAR: "QA", KUWAIT: "KW", BAHRAIN: "BH", JORDAN: "JO",
    // 3-letter codes
    ARG: "AR", FRA: "FR", BRA: "BR", GER: "DE", ESP: "ES", SPA: "ES", ENG: "GB-ENG",
    POR: "PT", NED: "NL", BEL: "BE", CRO: "HR", MAR: "MA",
    JPN: "JP", MEX: "MX", SEN: "SN", NGA: "NG", URU: "UY", COL: "CO",
    VIE: "VN", MYA: "MM", NZL: "NZ", IND: "IN", AUS: "AU",
    CHI: "CL", PER: "PE", ECU: "EC", PAR: "PY", BOL: "BO",
    VEN: "VE", PAN: "PA", CRC: "CR", HON: "HN", GUA: "GT",
    WAL: "GB-WLS", SCO: "GB-SCT", IRL: "IE", AUT: "AT", SWE: "SE",
    NOR: "NO", FIN: "FI", POL: "PL", CZE: "CZ", SVK: "SK", HUN: "HU",
    ROU: "RO", SRB: "RS", UKR: "UA", RUS: "RU", TUR: "TR", GRE: "GR",
    LIE: "LI", GIB: "GI", CMR: "CM", GHA: "GH", CIV: "CI", EGY: "EG",
    ALG: "DZ", TUN: "TN", KSA: "SA", IRN: "IR", IRQ: "IQ",
    MIA: "US", LAG: "US", NYC: "US", ATL: "US", SEA: "US",
    MIL: "IT", JUV: "IT", INT: "IT", NAP: "IT",
  };
  // Try exact match first
  if (map[n]) return map[n];
  // Try first 3 chars of longer names
  if (n.length > 3 && map[n.slice(0, 3)]) return map[n.slice(0, 3)];
  // If it's already a 2-letter ISO code, use it directly
  if (n.length === 2) return n;
  // If 3-letter code not found, try common patterns
  if (n.length === 3) {
    // Many 3-letter codes match their 2-letter ISO with first 2 chars
    return n.slice(0, 2);
  }
  return "UN";
}

// flagcdn – crisp SVG flags, professional, no emoji rendering issues
// Handles subdivision codes like GB-ENG correctly
export function flagUrl(countryCodeStr: string, size: 20|40|80 = 40): string {
  const code = countryCode(countryCodeStr);
  const w = size === 20 ? 20 : size === 80 ? 80 : 40;
  // flagcdn supports subdivision codes like gb-eng, gb-wls, gb-sct
  const cdnCode = code.toLowerCase();
  return `https://flagcdn.com/w${w}/${cdnCode}.png`;
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
    const fixtures: Fixture[] = (j.data || []).map((f: Record<string, unknown>, index: number) => {
      const home = (f.home as string) || (f.Participant1 as string) || "Home";
      const away = (f.away as string) || (f.Participant2 as string) || "Away";
      const homeCode = (f.homeCode as string) || home.slice(0,3).toUpperCase();
      const awayCode = (f.awayCode as string) || away.slice(0,3).toUpperCase();
      return {
        fixtureId: (f.fixtureId as number) ?? (f.FixtureId as number) ?? (f.id as number) ?? (index + 1),
        home, away, homeCode, awayCode,
        status: (f.status as string) || ((f.GameState as number) === 1 ? "Scheduled" : "LIVE"),
        minute: (f.minute as number) ?? 0,
        homeScore: (f.homeScore as number) ?? 0,
        awayScore: (f.awayScore as number) ?? 0,
        competition: (f.competition as string) || (f.Competition as string) || "FIFA World Cup 2026",
        startTime: (f.startTime as number) ?? 0,
        venue: (f.venue as string) || "",
        round: (f.round as string) || "",
        group: (f.group as string) || "",
      };
    });
    return { fixtures, source: ((j.source || "demo") as "txline_live"|"txline_replay"|"demo") };
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