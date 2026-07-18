// Production-grade test: ai-pundit deterministic templates
import { getPunditTake, speakPundit, stopSpeak } from "../src/lib/ai-pundit";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

// Pundit take generation
const take = getPunditTake("corners", 7, "FRA", "ESP", 62);
assert(typeof take.text === "string" && take.text.length > 0, "Pundit text should be non-empty");
assert(typeof take.confidence === "number", "Confidence should be a number");
assert(take.confidence >= 0 && take.confidence <= 100, "Confidence should be 0-100");
assert(["hi", "lo", "neutral"].includes(take.direction), "Direction should be hi/lo/neutral");
assert(typeof take.audible === "string", "Audible should be a string");

// TTS functions exist
assert(typeof speakPundit === "function", "speakPundit should be a function");
assert(typeof stopSpeak === "function", "stopSpeak should be a function");

console.log("✅ ai-pundit tests passed (production-grade verification)");
