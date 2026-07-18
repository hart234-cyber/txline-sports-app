// Production-grade test: txline-client normalization and stats
import { STATS, getReplayValue, getOddsSpark, extractStatFromTxlineScore, countryCode, flagUrl } from "../src/lib/txline-client";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

// STATS array integrity
assert(STATS.length === 6, "STATS array should contain 6 stat keys");
assert(STATS.find(s => s.key === "corners") !== undefined, "Corners stat missing");

// Replay sequences
const replayVal = getReplayValue("corners", 3);
assert(typeof replayVal === "number", "Replay value should be a number");
assert(replayVal >= 0, "Replay value should be non-negative");

// Sparkline
const spark = getOddsSpark("shots", 5);
assert(spark.length === 18, "Sparkline should have 18 points");
assert(spark.every(v => typeof v === "number"), "All sparkline values should be numbers");

// Country code mapping
assert(countryCode("France") === "FR", "France should map to FR");
assert(countryCode("USA") === "US", "USA should map to US");

// Flag URL
const url = flagUrl("FR", 40);
assert(url.includes("flagcdn.com"), "Flag URL should use flagcdn");
assert(url.includes("fr"), "Flag URL should contain country code");

// Extract stat
const mockPayload = { statistics: { corners: 5, shots_on_target: 2 } };
assert(extractStatFromTxlineScore(mockPayload, "corners") === 5, "Should extract corners");
assert(extractStatFromTxlineScore(mockPayload, "shots_on_target") === 2, "Should extract shots on target");

console.log("✅ txline-client tests passed (production-grade verification)");
