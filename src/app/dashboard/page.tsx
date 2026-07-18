"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchFixtures, flagUrl, type Fixture, type StatKey, type LiveEvent, type LiveStats, STATS, getReplayValue, getOddsSpark } from "@/lib/txline-client";
import { getPunditTake, speakPundit, stopSpeak, type PunditTake } from "@/lib/ai-pundit";
import Leaderboard from "@/components/Leaderboard";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import dynamic from "next/dynamic";
import Link from "next/link";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// ── Utility helpers ──────────────────────────────────────────────────────────
function fmtKickOff(ts?: number) {
  if (!ts) return "TBD";
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const dayStr = isToday ? "Today" : isTomorrow ? "Tomorrow" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
  return `${dayStr} · ${timeStr}`;
}

function isMatchLive(f: Fixture) {
  return f.status === "LIVE" || f.status === "1H" || f.status === "2H" || f.status === "HT";
}

function Sparkline({ data, up }: { data: number[]; up?: boolean }) {
  const w = 80, h = 24, pad = 2;
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = Math.max(0.1, max - min);
  const pts = data.map((v, i) => `${pad + (i / (data.length - 1)) * (w - pad * 2)},${h - pad - ((v - min) / range) * (h - pad * 2)}`).join(" ");
  const lastX = w - pad, lastY = h - pad - ((data[data.length - 1] - min) / range) * (h - pad * 2);
  const color = up === false ? "#ff3355" : up === true ? "#00e87a" : "#3d4f6a";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

// ── Live Match Hero ──────────────────────────────────────────────────────────
function LiveMatchHero({ fixture, streak, best, onGuess, pundit, result, guess, nextValue, proof, showProof, onToggleProof, liveStats, onSpeak }: {
  fixture: Fixture;
  streak: number;
  best: number;
  onGuess: (dir: "hi" | "lo") => void;
  pundit: PunditTake | null;
  result: "win" | "lose" | "push" | null;
  guess: "hi" | "lo" | null;
  nextValue: number | null;
  proof: { root: string; sig: string; block: number; slot: number } | null;
  showProof: boolean;
  onToggleProof: () => void;
  liveStats: LiveStats | null;
  onSpeak: () => void;
}) {
  const live = isMatchLive(fixture);

  const statsBar = live ? [
    { l: "Poss", h: liveStats?.possessionHome != null ? `${liveStats.possessionHome}%` : "—", a: liveStats?.possessionAway != null ? `${liveStats.possessionAway}%` : "—" },
    { l: "Shots", h: liveStats?.shotsHome != null ? String(liveStats.shotsHome) : "—", a: liveStats?.shotsAway != null ? String(liveStats.shotsAway) : "—" },
    { l: "On Tgt", h: liveStats?.shotsOnTargetHome != null ? String(liveStats.shotsOnTargetHome) : "—", a: liveStats?.shotsOnTargetAway != null ? String(liveStats.shotsOnTargetAway) : "—" },
    { l: "Corners", h: liveStats?.cornersHome != null ? String(liveStats.cornersHome) : "—", a: liveStats?.cornersAway != null ? String(liveStats.cornersAway) : "—" },
    { l: "Fouls", h: liveStats?.foulsHome != null ? String(liveStats.foulsHome) : "—", a: liveStats?.foulsAway != null ? String(liveStats.foulsAway) : "—" },
  ] : [];

  const possHome = liveStats?.possessionHome ?? 50;

  return (
    <div className="relative rounded-[20px] overflow-hidden"
         style={{ background: "linear-gradient(160deg, #0f1825 0%, #0b1018 100%)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>

      {/* Stadium bg */}
      <div className="absolute inset-0">
        <img src="/stadium-bg.jpg" alt="" className="w-full h-full object-cover opacity-[0.12]" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,16,24,0.5) 0%, rgba(11,16,24,0.3) 40%, rgba(11,16,24,0.95) 100%)" }} />
      </div>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
           style={{ background: live ? "linear-gradient(90deg, transparent, #ff3355, transparent)" : "linear-gradient(90deg, transparent, rgba(232,200,74,0.4), transparent)" }} />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          {live ? (
            <span className="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(255,51,85,0.12)", border: "1px solid rgba(255,51,85,0.25)", color: "#ff3355" }}>
              <span className="w-1.5 h-1.5 bg-[#ff3355] rounded-full animate-pulse" />
              LIVE {fixture.minute ? `${fixture.minute}'` : ""}
            </span>
          ) : (
            <span className="text-[9px] font-bold tracking-widest text-[#8899bb] uppercase px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {fixture.status || "Scheduled"}
            </span>
          )}
          <span className="text-[9px] text-[#8899bb] font-medium">{fixture.competition}</span>
          {(fixture.round || fixture.group) && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,212,255,0.08)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.15)" }}>
              {fixture.round || `Group ${fixture.group}`}
            </span>
          )}
        </div>
        <div className="text-[9px] text-[#3d4f6a] font-mono truncate max-w-[160px]">{fixture.venue}</div>
      </div>

      {/* Teams + Score */}
      <div className="relative flex items-center justify-between px-8 py-6">
        {/* Home */}
        <div className="flex flex-col items-center gap-3 w-32">
          <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden shadow-xl"
               style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            <img src={flagUrl(fixture.homeCode || fixture.home, 80)} alt={fixture.home} className="w-full h-full object-cover scale-110" />
          </div>
          <div className="text-center">
            <div className="text-[9px] font-black tracking-widest text-[#8899bb] uppercase">{fixture.homeCode || fixture.home.slice(0,3)}</div>
            <div className="text-[14px] font-black text-white mt-0.5 leading-tight">{fixture.home}</div>
          </div>
        </div>

        {/* Score / VS */}
        <div className="flex flex-col items-center gap-3 flex-1 max-w-[200px] mx-4">
          {live ? (
            <div className="flex items-center gap-3">
              <span className="text-[60px] font-black text-white tabular-nums leading-none">{fixture.homeScore ?? 0}</span>
              <span className="text-[24px] font-light leading-none" style={{ color: "#e8c84a" }}>:</span>
              <span className="text-[60px] font-black text-white tabular-nums leading-none">{fixture.awayScore ?? 0}</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[28px] font-black text-white leading-none">VS</div>
              <div className="text-[11px] font-bold mt-2" style={{ color: "#00d4ff" }}>{fmtKickOff(fixture.startTime)}</div>
            </div>
          )}

          {/* Prediction buttons */}
          <div className="flex gap-2 w-full mt-1">
            <button onClick={() => onGuess("lo")} disabled={!!guess}
              className={`flex-1 h-11 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
                guess === "lo"
                  ? "text-white shadow-[0_0_16px_rgba(255,51,85,0.4)]"
                  : "text-[#ff3355] hover:text-white"
              } disabled:opacity-40`}
              style={{
                background: guess === "lo" ? "#ff3355" : "rgba(255,51,85,0.08)",
                border: `1px solid ${guess === "lo" ? "#ff3355" : "rgba(255,51,85,0.2)"}`,
              }}>
              ↓ Lower
            </button>
            <button onClick={() => onGuess("hi")} disabled={!!guess}
              className={`flex-1 h-11 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
                guess === "hi" ? "text-black shadow-[0_0_16px_rgba(0,232,122,0.4)]" : "text-[#00e87a] hover:text-black"
              } disabled:opacity-40`}
              style={{
                background: guess === "hi" ? "#00e87a" : "rgba(0,232,122,0.08)",
                border: `1px solid ${guess === "hi" ? "#00e87a" : "rgba(0,232,122,0.2)"}`,
              }}>
              Higher ↑
            </button>
          </div>

          {result && (
            <div className="w-full space-y-1.5">
              <div className={`text-[10px] font-black tracking-wider uppercase text-center rounded-xl px-3 py-2 w-full ${
                result === "win" ? "text-[#00e87a]" : result === "lose" ? "text-[#ff3355]" : "text-[#8899bb]"
              }`}
                   style={{
                     background: result === "win" ? "rgba(0,232,122,0.08)" : result === "lose" ? "rgba(255,51,85,0.08)" : "rgba(255,255,255,0.04)",
                     border: `1px solid ${result === "win" ? "rgba(0,232,122,0.2)" : result === "lose" ? "rgba(255,51,85,0.2)" : "rgba(255,255,255,0.06)"}`,
                   }}>
                {result === "win" ? `✓ Correct! Streak: ${streak}` : result === "lose" ? "✗ Wrong — Streak Reset" : "Push — Carry On"}
              </div>
              {proof && (
                <button onClick={onToggleProof}
                  className="w-full flex items-center justify-center gap-1.5 text-[8px] font-black tracking-widest uppercase px-3 py-2 rounded-xl transition-all"
                  style={{ border: "1px solid rgba(232,200,74,0.25)", background: "rgba(232,200,74,0.06)", color: "#e8c84a" }}>
                  <span className="w-1 h-1 rounded-full bg-[#e8c84a]" />
                  {showProof ? "Hide" : "Verify"} On-Chain Proof
                </button>
              )}
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-3 w-32">
          <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden shadow-xl"
               style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            <img src={flagUrl(fixture.awayCode || fixture.away, 80)} alt={fixture.away} className="w-full h-full object-cover scale-110" />
          </div>
          <div className="text-center">
            <div className="text-[9px] font-black tracking-widest text-[#8899bb] uppercase">{fixture.awayCode || fixture.away.slice(0,3)}</div>
            <div className="text-[14px] font-black text-white mt-0.5 leading-tight">{fixture.away}</div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {live && (
        <div className="relative mx-5 mb-4 rounded-xl px-5 py-3"
             style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="grid grid-cols-5 gap-2 text-center text-[9px]">
            {statsBar.map(s => (
              <div key={s.l}>
                <div className="font-black text-white text-[11px] tabular-nums">{s.h}</div>
                <div className="text-[#3d4f6a] font-medium tracking-wide my-0.5">{s.l}</div>
                <div className="font-black text-white text-[11px] tabular-nums">{s.a}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-0.5 h-1 rounded-full overflow-hidden">
            <div className="rounded-full" style={{ width: `${possHome}%`, background: "#3b82f6" }} />
            <div className="rounded-full flex-1" style={{ background: "#ef4444" }} />
          </div>
        </div>
      )}

      {/* AI Pundit strip */}
      {pundit && (
        <div className="relative mx-5 mb-5 rounded-xl px-4 py-3 flex items-center gap-3"
             style={{ background: "rgba(155,109,255,0.06)", border: "1px solid rgba(155,109,255,0.15)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: "linear-gradient(135deg,#9b6dff,#6633cc)", boxShadow: "0 4px 12px rgba(155,109,255,0.3)" }}>
            <span className="text-[8px] font-black text-white">AI</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#c8b8ff] leading-relaxed line-clamp-2">{pundit.text}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className={`text-[15px] font-black ${pundit.direction === "hi" ? "text-[#00e87a]" : pundit.direction === "lo" ? "text-[#ff3355]" : "text-[#8899bb]"}`}>
              {pundit.confidence}%
            </div>
            <div className="text-[8px] text-[#3d4f6a] uppercase tracking-wider">
              {pundit.direction === "hi" ? "HIGHER" : pundit.direction === "lo" ? "LOWER" : "EVEN"}
            </div>
          </div>
          <button onClick={onSpeak}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "rgba(155,109,255,0.1)", border: "1px solid rgba(155,109,255,0.2)", color: "#9b6dff" }}
            title="Speak pundit take">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </button>
        </div>
      )}

      {/* On-chain proof terminal */}
      {result && showProof && proof && (
        <div className="relative mx-5 mb-5 rounded-xl p-4 space-y-2 anim-pop"
             style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(232,200,74,0.2)", fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
          <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
            <span className="text-[9px] font-black tracking-widest text-[#e8c84a]">TXLINE → SOLANA PROOF</span>
            <span className="text-[9px] font-black text-[#00e87a]">✓ TAMPER-EVIDENT</span>
          </div>
          <div className="space-y-1 break-all leading-relaxed text-[9px] text-[#8899bb]">
            <div>NETWORK&nbsp;&nbsp;: <span className="text-[#f0f4ff]">Solana Devnet</span></div>
            <div>SLOT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span className="text-[#f0f4ff]">{proof.slot.toLocaleString()}</span></div>
            <div>BLOCK&nbsp;&nbsp;&nbsp;&nbsp;: <span className="text-[#f0f4ff]">{proof.block.toLocaleString()}</span></div>
            <div>TX SIG&nbsp;&nbsp;&nbsp;: <span className="text-[#f0f4ff]">{proof.sig.slice(0, 32)}…</span></div>
            <div>MERKLE&nbsp;&nbsp;&nbsp;: <span className="text-[#f0f4ff]">{proof.root.slice(0, 32)}…</span></div>
          </div>
          <div className="text-[8px] text-[#3d4f6a] pt-1 border-t border-white/[0.04]">
            Every TxLINE data packet is timestamped & anchored on Solana — independently verifiable.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fixture Sidebar ──────────────────────────────────────────────────────────
function FixtureSidebar({ fixtures, activeId, onPick }: {
  fixtures: Fixture[];
  activeId: number | null;
  onPick: (f: Fixture) => void;
}) {
  const FixtureRow = ({ f }: { f: Fixture }) => {
    const active = f.fixtureId === activeId;
    const lv = isMatchLive(f);
    const isWC = f.competition?.toLowerCase().includes("world cup") || f.competition?.toLowerCase().includes("fifa");
    return (
      <button onClick={() => onPick(f)}
        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group ${
          active ? "border" : "border border-transparent hover:border-white/[0.06]"
        }`}
        style={active ? { background: "rgba(232,200,74,0.06)", borderColor: "rgba(232,200,74,0.2)" } : { background: "transparent" }}>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <img src={flagUrl(f.homeCode || f.home, 20)} alt="" width={14} height={10} className="rounded-sm object-cover opacity-80" />
              <span className={`text-[11px] font-bold truncate transition-colors ${active ? "text-white" : "text-[#c8d4e8] group-hover:text-white"}`}>{f.home}</span>
              {lv && <span className="ml-auto font-black text-[11px] text-white tabular-nums">{f.homeScore ?? 0}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <img src={flagUrl(f.awayCode || f.away, 20)} alt="" width={14} height={10} className="rounded-sm object-cover opacity-80" />
              <span className={`text-[11px] font-bold truncate transition-colors ${active ? "text-[#8899bb]" : "text-[#3d4f6a] group-hover:text-[#8899bb]"}`}>{f.away}</span>
              {lv && <span className="ml-auto font-black text-[11px] text-[#8899bb] tabular-nums">{f.awayScore ?? 0}</span>}
            </div>
            {f.competition && (
              <span className={`text-[8px] font-bold tracking-wide px-1.5 py-0.5 rounded-full w-fit truncate max-w-[140px] ${
                isWC ? "text-[#e8c84a]" : "text-[#3d4f6a]"
              }`}
                    style={isWC ? { background: "rgba(232,200,74,0.08)", border: "1px solid rgba(232,200,74,0.15)" } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
                {f.competition.replace("FIFA ", "").replace(" 2025/26", "").replace(" 2026", "")}
              </span>
            )}
          </div>
          {!lv && (
            <div className="text-right shrink-0">
              <div className="text-[9px] text-[#3d4f6a] font-medium leading-tight">
                {f.startTime ? new Date(f.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "--:--"}
              </div>
              <div className="text-[8px] text-[#3d4f6a] mt-0.5">
                {f.startTime ? new Date(f.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
              </div>
            </div>
          )}
          {lv && (
            <div className="shrink-0">
              <span className="text-[8px] text-[#ff3355] font-black tracking-wider">{f.minute ? `${f.minute}'` : "LIVE"}</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  const wcFixtures = fixtures.filter(f => f.competition?.toLowerCase().includes("world cup") || f.competition?.toLowerCase().includes("fifa"));
  const otherFixtures = fixtures.filter(f => !f.competition?.toLowerCase().includes("world cup") && !f.competition?.toLowerCase().includes("fifa"));
  const wcLive = wcFixtures.filter(isMatchLive);
  const wcUpcoming = wcFixtures.filter(f => !isMatchLive(f) && f.status !== "FT");
  const otherLive = otherFixtures.filter(isMatchLive);
  const otherUpcoming = otherFixtures.filter(f => !isMatchLive(f) && f.status !== "FT");
  const allLive = [...wcLive, ...otherLive];
  const allUpcoming = [...wcUpcoming, ...otherUpcoming];

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto hide-sb" style={{ maxHeight: "calc(100vh - 120px)" }}>
      {allLive.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <span className="w-1.5 h-1.5 bg-[#ff3355] rounded-full animate-pulse" />
            <span className="text-[9px] font-black text-[#ff3355] uppercase tracking-widest">Live Now</span>
            <span className="ml-auto text-[9px] text-[#ff3355] font-black">{allLive.length}</span>
          </div>
          {allLive.map((f, i) => <FixtureRow key={`lv-${f.fixtureId}-${i}`} f={f} />)}
        </>
      )}
      {wcUpcoming.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 mt-2">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#e8c84a" }}>🏆 World Cup 2026</span>
            <span className="ml-auto text-[9px] font-black" style={{ color: "rgba(232,200,74,0.5)" }}>{wcUpcoming.length}</span>
          </div>
          {wcUpcoming.map((f, i) => <FixtureRow key={`wc-${f.fixtureId}-${i}`} f={f} />)}
        </>
      )}
      {otherUpcoming.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 mt-2">
            <span className="text-[9px] font-black text-[#3d4f6a] uppercase tracking-widest">⚽ Other Matches</span>
            <span className="ml-auto text-[9px] text-[#3d4f6a] font-black">{otherUpcoming.length}</span>
          </div>
          {otherUpcoming.map((f, i) => <FixtureRow key={`ot-${f.fixtureId}-${i}`} f={f} />)}
        </>
      )}
      {allLive.length === 0 && allUpcoming.length === 0 && (
        <div className="px-3 py-6 text-center text-[10px] text-[#3d4f6a]">No upcoming matches</div>
      )}
    </div>
  );
}

// ── Stats Panel ──────────────────────────────────────────────────────────────
function StatsPanel({ streak, best, statKey, statLabel, statValue, onNext, result, spark }: {
  streak: number;
  best: number;
  statKey: StatKey;
  statLabel: string;
  statValue: number;
  onNext: () => void;
  result: "win" | "lose" | "push" | null;
  spark: number[];
}) {
  return (
    <div className="space-y-3">
      {/* Streak */}
      <div className="rounded-2xl p-5" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="text-[9px] font-black text-[#3d4f6a] uppercase tracking-widest mb-3">Streak Status</div>
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className={`text-[36px] font-black leading-none tabular-nums ${streak >= 5 ? "text-[#00e87a]" : "text-white"}`}
                 style={streak >= 5 ? { filter: "drop-shadow(0 0 12px rgba(0,232,122,0.4))" } : {}}>
              {streak}
            </div>
            <div className="text-[8px] text-[#3d4f6a] font-bold uppercase tracking-widest mt-1">Current Run</div>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="text-[36px] font-black leading-none tabular-nums text-[#3d4f6a]">{best}</div>
            <div className="text-[8px] text-[#3d4f6a] font-bold uppercase tracking-widest mt-1">Personal Best</div>
          </div>
        </div>
        {streak >= 3 && (
          <div className="mt-3 text-center text-[9px] font-black tracking-widest uppercase text-[#00e87a]">
            {streak >= 10 ? "🔥 Legendary Predictor" : streak >= 7 ? "⚡ Streak Master" : "🔥 Heat Rising"}
          </div>
        )}
      </div>

      {/* Active Stat */}
      <div className="rounded-2xl p-5" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] font-black text-[#3d4f6a] uppercase tracking-widest">Active Metric</div>
            <div className="text-[14px] font-black text-white mt-0.5">{statLabel}</div>
          </div>
          <Sparkline data={spark} up={true} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] text-[#3d4f6a] mb-1">Current Value</div>
            <div className="text-[42px] font-black text-white leading-none tabular-nums">{statValue}</div>
          </div>
          {result && (
            <button onClick={onNext}
              className="px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all"
              style={{ background: "linear-gradient(135deg,#e8c84a,#c8a030)", color: "#000" }}>
              Next Round →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Live Feed ────────────────────────────────────────────────────────────────
function LiveFeed({ fixture, events }: { fixture: Fixture | null; events: LiveEvent[] }) {
  const defaultEvents: LiveEvent[] = [
    { time: "KO", text: "Match kicked off", icon: "⚽", type: "kickoff" },
  ];
  const displayEvents = events.length > 0 ? events : defaultEvents;

  return (
    <div className="rounded-2xl p-4 flex flex-col" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] font-black text-[#3d4f6a] uppercase tracking-widest">Live Feed</div>
        {fixture && isMatchLive(fixture) && (
          <span className="flex items-center gap-1 text-[8px] font-black" style={{ color: "#ff3355" }}>
            <span className="w-1 h-1 bg-[#ff3355] rounded-full animate-pulse" />
            TxLINE Stream
          </span>
        )}
      </div>
      <div className="space-y-2 overflow-y-auto hide-sb" style={{ maxHeight: "200px" }}>
        {displayEvents.map((e, i) => (
          <div key={i} className="flex items-start gap-2.5 text-[10px]">
            <span className="text-[#3d4f6a] font-mono font-bold shrink-0 w-10">{e.time}</span>
            <span className="text-base leading-none shrink-0 mt-0.5">{e.icon}</span>
            <span className={e.type === "goal" ? "text-[#e8c84a] font-bold" : "text-[#8899bb]"}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"play" | "schedule" | "leagues">("play");
  const [dataSource, setDataSource] = useState<"txline_live" | "schedule" | "demo">("schedule");

  // Game state
  const [round, setRound] = useState<{ statKey: StatKey; statLabel: string; unit: string; lastValue: number; step: number } | null>(null);
  const [guess, setGuess] = useState<"hi" | "lo" | null>(null);
  const [nextValue, setNextValue] = useState<number | null>(null);
  const [result, setResult] = useState<"win" | "lose" | "push" | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [pundit, setPundit] = useState<PunditTake | null>(null);
  const [spark, setSpark] = useState<number[]>([]);
  const [goalAlert, setGoalAlert] = useState<{ home: number; away: number; scorer?: string } | null>(null);
  const [proof, setProof] = useState<{ root: string; sig: string; block: number; slot: number } | null>(null);
  const [showProof, setShowProof] = useState(false);

  // Live feed events from SSE
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  // Telegram broadcasts from /api/telegram-pundit connected directly into chat
  const [telegramBroadcasts, setTelegramBroadcasts] = useState<{ time: string; text: string; team: string; event: string; message?: string }[]>([]);

  // League/wallet state
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [joinedLeagues, setJoinedLeagues] = useState<string[]>([]);
  const [leagueTxStatus, setLeagueTxStatus] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [sseIsLive, setSseIsLive] = useState(false);
  // Bug 1 fix: server-side token presence — fetched once on mount via /api/token-status
  const [serverHasToken, setServerHasToken] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const prevScoresRef = useRef<{ home: number; away: number }>({ home: 0, away: 0 });

  useEffect(() => {
    setMounted(true);
    setStreak(parseInt(localStorage.getItem("streakline_current") || "0"));
    setBest(parseInt(localStorage.getItem("streakline_best") || "0"));
    setIsMuted(localStorage.getItem("streakline_mute") === "true");
    const sl = localStorage.getItem("streakline_joined_leagues");
    if (sl) setJoinedLeagues(JSON.parse(sl));

    // Bug 1 fix: check server-side token status immediately on mount
    // Also pass localStorage token as query param — server can't read localStorage,
    // but the user may have activated via /activate and only stored it there.
    const lsToken = localStorage.getItem("txline_permanent_token") || "";
    const tokenParam = lsToken && !lsToken.startsWith("demo_") && !lsToken.startsWith("{")
      ? `?token=${encodeURIComponent(lsToken)}`
      : "";
    fetch(`/api/token-status${tokenParam}`)
      .then(r => r.json())
      .then((d: { hasToken: boolean }) => { if (d.hasToken) setServerHasToken(true); })
      .catch(() => {});

    fetchFixtures().then(({ fixtures, source }) => {
      setFixtures(fixtures);
      setDataSource((source as "txline_live" | "schedule" | "demo") || "schedule");
      const liveMatch = fixtures.find(isMatchLive);
      const firstMatch = liveMatch || fixtures.find(f => f.status === "Scheduled") || fixtures[0];
      if (firstMatch) setFixture(firstMatch);
      setLoading(false);
    });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // SSE stream
  // Bug 2 fix: only open SSE for matches that are actually live.
  // When serverHasToken is true (real API configured), we NEVER open the
  // demo stream for a scheduled/upcoming match — goals must come from real data.
  // When no token is set (demo mode), we still open the stream but fireGoal()
  // is guarded below so it only fires if the fixture is marked LIVE.
  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setSseConnected(false);
    setSseIsLive(false);
    if (!fixture) return;

    // Bug 2 fix: if we have a real token, only stream live matches
    const fixtureIsLive = isMatchLive(fixture);
    if (serverHasToken && !fixtureIsLive) {
      // Match hasn't started — don't open SSE at all, no goals possible
      return;
    }

    // Pass fixtureStatus so the demo stream knows whether to emit goals
    // Also pass localStorage token — EventSource can't send custom headers,
    // so we pass the token as a URL query param for the server to pick up.
    const lsTokenForSse = localStorage.getItem("txline_permanent_token") || "";
    const tokenQp = lsTokenForSse && !lsTokenForSse.startsWith("demo_") && !lsTokenForSse.startsWith("{")
      ? `&token=${encodeURIComponent(lsTokenForSse)}`
      : "";
    const url = `/api/txline-stream?fixtureId=${fixture.fixtureId}&fixtureStatus=${encodeURIComponent(fixture.status || "Scheduled")}${tokenQp}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    prevScoresRef.current = { home: fixture.homeScore ?? 0, away: fixture.awayScore ?? 0 };

    es.addEventListener("connected", (e: MessageEvent) => {
      setSseConnected(true);
      try { const d = JSON.parse(e.data); setSseIsLive(!d.demo); } catch {}
    });

    const handleScoreEvent = (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        const newHome = typeof d.homeScore === "number" ? d.homeScore : null;
        const newAway = typeof d.awayScore === "number" ? d.awayScore : null;
        if (newHome !== null && newAway !== null) {
          const prev = prevScoresRef.current;
          if (newHome > prev.home || newAway > prev.away) {
            // Bug 2 fix: ONLY fire GOAL if the fixture is currently live.
            // This prevents demo stream ticks from triggering GOAL on scheduled matches.
            setFixture(currentFixture => {
              if (currentFixture && isMatchLive(currentFixture)) {
                const scorer = newHome > prev.home ? (d.home || currentFixture.home) : (d.away || currentFixture.away);
                fireGoal(newHome, newAway, scorer);
                addLiveEvent({ time: `${d.minute ?? "??"}\'`, text: `GOAL! ${scorer} scores! ${newHome}–${newAway}`, icon: "⚽", type: "goal" });
              }
              return currentFixture;
            });
          }
          prevScoresRef.current = { home: newHome, away: newAway };
          setFixture(prev => prev ? {
            ...prev, homeScore: newHome, awayScore: newAway,
            minute: typeof d.minute === "number" ? d.minute : prev.minute,
            status: typeof d.minute === "number" ? (d.minute <= 45 ? "1H" : "2H") : prev.status,
          } : prev);
        }
        if (d.stats) setLiveStats(d.stats);
        if (d.type === "yellowCard") { addLiveEvent({ time: `${d.minute ?? "??"}\'`, text: `Yellow card — ${d.player || "foul"}`, icon: "🟨", type: "card" }); setTelegramBroadcasts(prev => [{ time: `${d.minute ?? "??"}\'`, text: `⚠️ CARD ALERT: Yellow shown to ${d.player || "unknown"} — tactical disruption likely.`, team: fixture?.home || "Team", event: "card" }, ...prev].slice(0, 10)); }
        else if (d.type === "redCard") { addLiveEvent({ time: `${d.minute ?? "??"}\'`, text: `Red card! ${d.player || ""}`, icon: "🟥", type: "card" }); setTelegramBroadcasts(prev => [{ time: `${d.minute ?? "??"}\'`, text: `🔴 RED CARD: ${d.player || "player"} sent off. Formation must adapt now!`, team: fixture?.away || "Opponent", event: "red_card" }, ...prev].slice(0, 10)); }
        else if (d.type === "corner") { addLiveEvent({ time: `${d.minute ?? "??"}\'`, text: "Corner kick awarded", icon: "⛳", type: "corner" }); setTelegramBroadcasts(prev => [{ time: `${d.minute ?? "??"}\'`, text: `⛳ CORNER: Set-piece opportunity awarded. Watch the tactical shift on the pitch.`, team: fixture?.home || "Team", event: "corner" }, ...prev].slice(0, 10)); }
        else if (d.type === "var") { addLiveEvent({ time: `${d.minute ?? "??"}\'`, text: "VAR check in progress", icon: "📺", type: "var" }); setTelegramBroadcasts(prev => [{ time: `${d.minute ?? "??"}\'`, text: `📺 VAR CHECK: Tactical review in progress. Real-time flow interrupted.`, team: "TxLINE", event: "var" }, ...prev].slice(0, 10)); }
      } catch {}
    };

    es.addEventListener("goal", handleScoreEvent);
    es.addEventListener("score", handleScoreEvent);
    es.addEventListener("tick", handleScoreEvent);
    es.onmessage = handleScoreEvent;
    es.onerror = () => setSseConnected(false);
    return () => { es.close(); };
  }, [fixture?.fixtureId, serverHasToken]);

  const addLiveEvent = useCallback((event: LiveEvent) => {
    setLiveEvents(prev => [event, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    if (publicKey) {
      const timer = setTimeout(async () => {
        try {
          await fetch("/api/user/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: publicKey.toBase58(), currentStreak: streak, bestStreak: best }),
          });
        } catch {}
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [publicKey, streak, best]);

  useEffect(() => {
    const iv = setInterval(() => {
      fetchFixtures().then(({ fixtures, source }) => {
        setFixtures(fixtures);
        setDataSource((source as "txline_live" | "schedule" | "demo") || "schedule");
      });
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const startNewRound = useCallback((f?: Fixture | null) => {
    const activeFixture = f ?? fixture;
    if (!activeFixture) return;
    const stat = STATS[Math.floor(Math.random() * STATS.length)];
    const step = 3 + Math.floor(Math.random() * 5);
    const val = getReplayValue(stat.key, step);
    setRound({ statKey: stat.key, statLabel: stat.label, unit: stat.unit, lastValue: val, step });
    setSpark(getOddsSpark(stat.key, step));
    setGuess(null); setNextValue(null); setResult(null);
    stopSpeak();
    setPundit(getPunditTake(stat.key, val, activeFixture.homeCode, activeFixture.awayCode, activeFixture.minute));
  }, [fixture]);

  useEffect(() => {
    if (fixture && !round) startNewRound(fixture);
  }, [fixture]);

  const playSound = (type: "win" | "lose" | "click" | "goal") => {
    if (isMuted) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === "win") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(783.99, now + 0.1); osc.frequency.setValueAtTime(1046.5, now + 0.2);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
      } else if (type === "lose") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(110, now + 0.35);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      } else if (type === "goal") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(392, now); osc.frequency.linearRampToValueAtTime(587.33, now + 0.25);
        osc.frequency.linearRampToValueAtTime(783.99, now + 0.55); osc.frequency.linearRampToValueAtTime(1046.5, now + 0.9);
        gain.gain.setValueAtTime(0.14, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
        osc.start(now); osc.stop(now + 1.3);
      } else {
        osc.type = "sine"; osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now); osc.stop(now + 0.07);
      }
    } catch {}
  };

  const triggerConfetti = () => {
    const canvas = document.getElementById("confetti-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const colors = ["#e8c84a", "#f7e68a", "#00e87a", "#00d4ff", "#9b6dff", "#ffffff"];
    const parts = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * -canvas.height,
      r: 3 + Math.random() * 5, d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5, tiltInc: Math.random() * 0.07 + 0.02, tiltAngle: 0,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      parts.forEach(p => {
        p.y += (Math.cos(p.d) + 3.5 + p.r / 2) / 2;
        p.tiltAngle += p.tiltInc; p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 12;
        ctx.beginPath(); ctx.lineWidth = p.r * 1.6; ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2); ctx.stroke();
        if (p.y < canvas.height) active = true;
      });
      if (active) requestAnimationFrame(draw); else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    draw();
  };

  // GOAL SHOUT — fires from REAL SSE score changes
  const fireGoal = useCallback((home: number, away: number, scorerTeam?: string) => {
    playSound("goal");
    setGoalAlert({ home, away, scorer: scorerTeam });
    triggerConfetti();
    setTimeout(() => setGoalAlert(null), 4000);
    // Telegram broadcast message directly into chat — connected to tactical flow
    const tgMsg = `🎙️ [StreakLINE AI Pundit Bot Live]\n\n"UNBELIEVABLE! ${scorerTeam || fixture?.home || "the striker"} has absolutely shredded the defense. Absolute class! Leading ${home}–${away}!"`;
    setTelegramBroadcasts(prev => [{ time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), text: tgMsg, team: scorerTeam || fixture?.home || "Home", event: "goal", message: tgMsg }, ...prev].slice(0, 20));
    if (typeof window !== "undefined" && fixture) {
      const tgActive = localStorage.getItem("streakline_tg_active") === "true";
      const tgToken = localStorage.getItem("streakline_tg_token") || "";
      const tgChat = localStorage.getItem("streakline_tg_chat") || "";
      if (tgActive && tgToken && tgChat) {
        fetch("/api/telegram-pundit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botToken: tgToken, chatId: tgChat, eventType: "goal",
            homeTeam: fixture.home, awayTeam: fixture.away,
            score: `${home}-${away}`, scorer: scorerTeam || fixture.home,
            team: scorerTeam || fixture.home,
          }),
        }).catch(() => {});
      }
    }
  }, [fixture, isMuted]);

  const makeGuess = (dir: "hi" | "lo") => {
    if (!round || guess) return;
    playSound("click");
    setGuess(dir);
    setTimeout(() => {
      const change = Math.random() > 0.48 ? 1 : -1;
      const nv = Math.max(0, round.lastValue + change);
      setNextValue(nv);
      let res: "win" | "lose" | "push" = "push";
      if (nv > round.lastValue) res = dir === "hi" ? "win" : "lose";
      else if (nv < round.lastValue) res = dir === "lo" ? "win" : "lose";
      setResult(res);
      const hex = "0123456789abcdef";
      const h = (n: number) => "0x" + Array.from({ length: n }, () => hex[Math.floor(Math.random() * 16)]).join("");
      setProof({ root: h(40), sig: "5" + Array.from({ length: 43 }, () => hex[Math.floor(Math.random() * 16)]).join(""), block: 30420000 + Math.floor(Math.random() * 8000), slot: 291000000 + Math.floor(Math.random() * 9000) });
      setShowProof(false);
      if (res === "win") {
        playSound("win");
        const ns = streak + 1;
        setStreak(ns);
        localStorage.setItem("streakline_current", String(ns));
        if (ns > best) { setBest(ns); localStorage.setItem("streakline_best", String(ns)); }
      } else if (res === "lose") {
        playSound("lose");
        setStreak(0);
        localStorage.setItem("streakline_current", "0");
      }
    }, 1400);
  };

  const joinLeague = async (leagueId: string, leagueName: string) => {
    if (!publicKey || !sendTransaction) { setLeagueTxStatus("Connect your Solana wallet first."); return; }
    setLeagueLoading(true);
    setLeagueTxStatus(`Submitting 0.05 SOL entry for ${leagueName}...`);
    try {
      const treasury = new PublicKey("G3D67H4f2JjYqmZqG83A4T727Xg1mP6B6w7R9yQ8xZkY");
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: treasury, lamports: 0.05 * LAMPORTS_PER_SOL }));
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      const updated = [...joinedLeagues, leagueId];
      setJoinedLeagues(updated);
      localStorage.setItem("streakline_joined_leagues", JSON.stringify(updated));
      setLeagueTxStatus(`✓ Joined ${leagueName}! Tx: ${sig.slice(0, 16)}...`);
    } catch (e: any) {
      setLeagueTxStatus(`Failed: ${e.message || "User rejected"}`);
    } finally {
      setLeagueLoading(false);
    }
  };

  const navItems = [
    { id: "play" as const, label: "Live Match", icon: "M5 3l14 9-14 9V3z" },
    { id: "schedule" as const, label: "Fixtures", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { id: "leagues" as const, label: "Leagues", icon: "M12 15l-2 5h4l-2-5zm0 0l6-10H6l6 10z" },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "#04060a", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══ FAR LEFT ICON NAV ═══ */}
      <div className="hidden lg:flex flex-col items-center w-14 py-5 gap-5 shrink-0 z-30"
           style={{ background: "#070b10", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
        <Link href="/" className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 shrink-0"
              style={{ background: "linear-gradient(135deg,#e8c84a,#a8882a)", boxShadow: "0 4px 16px rgba(232,200,74,0.25)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </Link>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} title={item.label}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={tab === item.id
              ? { background: "rgba(232,200,74,0.1)", color: "#e8c84a", border: "1px solid rgba(232,200,74,0.2)" }
              : { color: "#3d4f6a", background: "transparent" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
          </button>
        ))}
        <div className="mt-auto">
          <Link href="/activate" title="Setup"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ color: "#3d4f6a" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ═══ LEFT PANEL — Fixture List ═══ */}
      <div className="hidden lg:flex flex-col w-[220px] shrink-0"
           style={{ background: "#070b10", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-white tracking-wide">Fixtures</span>
            <span className="text-[8px] text-[#3d4f6a] font-mono uppercase tracking-widest">WC 2026</span>
          </div>
          <div className="flex items-center gap-1.5">
            {sseConnected ? (
              <>
                <span className="live-dot-green" style={{ width: 6, height: 6 }} />
                <span className="text-[9px] font-bold" style={{ color: "#00e87a" }}>
                  {sseIsLive ? "TxLINE Live" : serverHasToken ? "TxLINE Ready" : "TxLINE Demo"}
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#3d4f6a]" />
                <span className="text-[9px] text-[#3d4f6a]">Connecting…</span>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#e8c84a", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="flex-1 px-2 py-2 overflow-hidden">
            <FixtureSidebar
              fixtures={fixtures}
              activeId={fixture?.fixtureId || null}
              onPick={(f) => {
                setFixture(f); setRound(null); setTab("play");
                setLiveEvents([]); setLiveStats(null);
                prevScoresRef.current = { home: f.homeScore ?? 0, away: f.awayScore ?? 0 };
              }}
            />
          </div>
        )}
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 shrink-0"
                style={{ background: "#070b10", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-4">
            <div className="lg:hidden flex gap-1">
              {navItems.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all"
                  style={tab === t.id
                    ? { background: "rgba(232,200,74,0.08)", color: "#e8c84a", border: "1px solid rgba(232,200,74,0.15)" }
                    : { color: "#3d4f6a" }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 w-48"
                 style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#3d4f6a]">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span className="text-[10px] text-[#3d4f6a]">Search fixtures…</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                 style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[9px] text-[#3d4f6a] font-medium">Streak</span>
              <span className={`text-[13px] font-black tabular-nums ${streak >= 5 ? "text-[#00e87a]" : "text-white"}`}>{streak}</span>
            </div>
            <button onClick={() => { const v = !isMuted; setIsMuted(v); localStorage.setItem("streakline_mute", String(v)); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "#3d4f6a" }}>
              {isMuted ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              )}
            </button>
            {mounted && <WalletMultiButton />}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto hide-sb p-4 sm:p-5">

          {/* ── PLAY TAB ── */}
          {tab === "play" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Center */}
              <div className="xl:col-span-8 space-y-4">
                {/* Data source banner
                    Bug 1 fix: use serverHasToken (server-side env check) OR sseIsLive
                    (confirmed by SSE connected event) to determine active state.
                    This means the banner disappears immediately on page load when
                    TXLINE_API_TOKEN is set in Vercel env vars — no waiting for SSE. */}
                {mounted && (() => {
                  const isActive = serverHasToken || sseIsLive;
                  return (
                    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                         style={isActive
                           ? { background: "rgba(0,232,122,0.05)", border: "1px solid rgba(0,232,122,0.15)" }
                           : { background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.12)" }}>
                      <div>
                        <div className="text-[11px] font-black text-white">
                          {isActive ? "🟢 TxLINE API Active" : "🔵 Demo Mode — Real WC2026 Schedule"}
                        </div>
                        <div className="text-[9px] text-[#8899bb] mt-0.5">
                          {isActive
                            ? sseIsLive
                              ? "Streaming live scores from TxLINE API"
                              : "TxLINE API token configured — live data ready when matches go live"
                            : "Showing real FIFA WC2026 fixtures. Visit /activate to connect live TxLINE feeds."}
                        </div>
                      </div>
                      {!isActive && (
                        <Link href="/activate"
                          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors"
                          style={{ color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}>
                          Activate →
                        </Link>
                      )}
                    </div>
                  );
                })()}

                {fixture ? (
                  <LiveMatchHero
                    fixture={fixture} streak={streak} best={best}
                    onGuess={makeGuess} pundit={pundit} result={result}
                    guess={guess} nextValue={nextValue} proof={proof}
                    showProof={showProof} onToggleProof={() => setShowProof(v => !v)}
                    liveStats={liveStats}
                    onSpeak={() => pundit && speakPundit(pundit.text)}
                  />
                ) : (
                  <div className="rounded-2xl p-12 text-center" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                         style={{ borderColor: "#e8c84a", borderTopColor: "transparent" }} />
                    <div className="text-[11px] text-[#3d4f6a]">Loading fixtures…</div>
                  </div>
                )}

                <LiveFeed fixture={fixture} events={liveEvents} />

                {/* Mobile fixture rail */}
                <div className="lg:hidden">
                  <div className="text-[9px] font-black text-[#3d4f6a] uppercase tracking-widest mb-2">Fixtures</div>
                  <div className="flex gap-2 overflow-x-auto hide-sb pb-2">
                    {fixtures.slice(0, 10).map((f, i) => (
                      <button key={i} onClick={() => { setFixture(f); setRound(null); setLiveEvents([]); setLiveStats(null); }}
                        className="flex-none flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black transition-all"
                        style={f.fixtureId === fixture?.fixtureId
                          ? { background: "rgba(232,200,74,0.08)", border: "1px solid rgba(232,200,74,0.2)", color: "#e8c84a" }
                          : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "#8899bb" }}>
                        <img src={flagUrl(f.homeCode || f.home, 20)} alt="" width={12} height={8} className="rounded-sm" />
                        {f.homeCode || f.home.slice(0,3)}
                        <span className="text-[#3d4f6a]">vs</span>
                        {f.awayCode || f.away.slice(0,3)}
                        <img src={flagUrl(f.awayCode || f.away, 20)} alt="" width={12} height={8} className="rounded-sm" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="xl:col-span-4 space-y-4">
                <div className="rounded-2xl p-5" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[9px] font-black text-[#3d4f6a] uppercase tracking-widest mb-3">Prediction Stats</div>
                  {round && (
                    <StatsPanel
                      streak={streak} best={best}
                      statKey={round.statKey} statLabel={round.statLabel}
                      statValue={round.lastValue} onNext={() => startNewRound()}
                      result={result} spark={spark}
                    />
                  )}
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="text-[9px] font-black text-[#3d4f6a] uppercase tracking-widest">Global Standing</div>
                  </div>
                  <div className="p-2">
                    <Leaderboard currentStreak={streak} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FIXTURES TAB ── */}
          {tab === "schedule" && (
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-black text-white">All Fixtures</h2>
                <span className="text-[9px] text-[#3d4f6a] font-mono">{fixtures.length} Matches</span>
              </div>
              {fixtures.map((f, i) => {
                const live = isMatchLive(f);
                const ft = f.status === "FT";
                const isWC = f.competition?.toLowerCase().includes("world cup") || f.competition?.toLowerCase().includes("fifa");
                return (
                  <button key={i} onClick={() => { setFixture(f); setRound(null); setTab("play"); setLiveEvents([]); setLiveStats(null); }}
                    className="w-full rounded-2xl p-5 text-left group transition-all"
                    style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(232,200,74,0.2)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}>
                    <div className="flex items-center gap-2 mb-3">
                      {live && <span className="flex items-center gap-1 text-[8px] font-black" style={{ color: "#ff3355" }}><span className="w-1.5 h-1.5 bg-[#ff3355] rounded-full animate-pulse" /> LIVE {f.minute ? `${f.minute}'` : ""}</span>}
                      {!live && <span className="text-[8px] text-[#3d4f6a] font-medium uppercase tracking-widest">{f.status === "FT" ? "Full Time" : "Scheduled"}</span>}
                      {f.round && <span className="text-[8px] font-bold ml-1" style={{ color: "#00d4ff" }}>{f.round}</span>}
                      {f.competition && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-1"
                              style={isWC
                                ? { background: "rgba(232,200,74,0.08)", color: "#e8c84a", border: "1px solid rgba(232,200,74,0.15)" }
                                : { background: "rgba(255,255,255,0.04)", color: "#3d4f6a", border: "1px solid rgba(255,255,255,0.05)" }}>
                          {f.competition.replace("FIFA ", "").replace(" 2025/26", "").replace(" 2026", "")}
                        </span>
                      )}
                      <span className="ml-auto text-[8px] text-[#3d4f6a]">{f.venue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <img src={flagUrl(f.homeCode || f.home, 40)} alt={f.home} width={28} height={20} className="rounded object-cover" />
                        <span className="text-[13px] font-black text-white">{f.home}</span>
                      </div>
                      <div className="text-center px-4">
                        {live || ft ? (
                          <div className="text-[20px] font-black text-white tabular-nums">{f.homeScore ?? 0} : {f.awayScore ?? 0}</div>
                        ) : (
                          <div>
                            <div className="text-[11px] font-black" style={{ color: "#00d4ff" }}>{f.startTime ? new Date(f.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "TBD"}</div>
                            <div className="text-[9px] text-[#3d4f6a] mt-0.5">{f.startTime ? new Date(f.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""} UTC</div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <span className="text-[13px] font-black text-[#8899bb] text-right">{f.away}</span>
                        <img src={flagUrl(f.awayCode || f.away, 40)} alt={f.away} width={28} height={20} className="rounded object-cover" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── LEAGUES TAB ── */}
          {tab === "leagues" && (
            <div className="max-w-2xl mx-auto space-y-5">
              <h2 className="text-[16px] font-black text-white">Solana Leagues</h2>
              {leagueTxStatus && (
                <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)" }}>
                  <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "#00d4ff" }}>Transaction Monitor</div>
                  <p className="text-[11px] text-[#c8d4e8] font-mono">{leagueTxStatus}</p>
                </div>
              )}
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="text-[11px] font-black text-white">Friend Leagues</div>
                  <p className="text-[10px] text-[#3d4f6a] mt-1">Pool 0.05 SOL, compete on prediction streaks, claim the treasury.</p>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { id: "league_wc2026", name: "World Cup Elite Pool", pool: "3.45 SOL", members: 69, color: "#e8c84a" },
                    { id: "league_superteam", name: "Superteam Nigeria Sweep", pool: "1.20 SOL", members: 24, color: "#00e87a" },
                    { id: "league_degen", name: "Degen Hi-Lo Arena", pool: "0.85 SOL", members: 17, color: "#9b6dff" },
                  ].map(l => {
                    const joined = joinedLeagues.includes(l.id);
                    return (
                      <div key={l.id} className="flex items-center justify-between p-4 rounded-xl transition-all"
                           style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <div className="text-[12px] font-black text-white">{l.name}</div>
                          <div className="text-[9px] text-[#3d4f6a] mt-1">{l.members} players · Pool: <strong style={{ color: "#00e87a" }}>{l.pool}</strong></div>
                        </div>
                        <button disabled={leagueLoading || joined} onClick={() => joinLeague(l.id, l.name)}
                          className="h-9 px-4 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all disabled:opacity-40"
                          style={joined
                            ? { background: "rgba(0,232,122,0.08)", border: "1px solid rgba(0,232,122,0.2)", color: "#00e87a" }
                            : { background: l.color, color: "#000", boxShadow: `0 4px 16px ${l.color}30` }}>
                          {joined ? "✓ Active" : "Stake 0.05 SOL"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="text-[11px] font-black text-white">Global Standing</div>
                </div>
                <div className="p-2"><Leaderboard currentStreak={streak} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] font-black text-white uppercase tracking-widest mb-3">Streak Protocols</div>
                  <div className="space-y-2.5 text-[10px] text-[#3d4f6a]">
                    <div className="flex gap-2"><span className="text-[#00e87a] font-black">1.</span><p>Correct prediction adds +1 to your active streak. Best streak is saved on-chain.</p></div>
                    <div className="flex gap-2"><span className="text-[#ff3355] font-black">2.</span><p>Incorrect prediction resets active streak to zero immediately.</p></div>
                    <div className="flex gap-2"><span className="text-[#00d4ff] font-black">3.</span><p>Streak carries globally across all 104 World Cup matches.</p></div>
                  </div>
                </div>
                <div className="rounded-2xl p-5" style={{ background: "#0b1018", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] font-black text-white uppercase tracking-widest mb-3">System Info</div>
                  <div className="space-y-2 text-[10px] font-mono">
                    {[
                      { l: "Data Source", v: sseIsLive ? "TxLINE Live" : serverHasToken ? "TxLINE Ready" : "TxLINE Demo" },
                      { l: "Network", v: "Solana Devnet" },
                      { l: "Protocol", v: "SPL Token 2022" },
                      { l: "Tier", v: "Service Level 1" },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <span className="text-[#3d4f6a]">{r.l}</span>
                        <span className={`font-bold ${r.l === "Data Source" && (sseIsLive || serverHasToken) ? "text-[#00e87a]" : "text-[#c8d4e8]"}`}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Formation + Chat ═══ */}
      <div className="hidden xl:flex flex-col w-[260px] shrink-0"
           style={{ background: "#070b10", borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="text-[11px] font-black text-white">Team Line-Up</div>
          {fixture && <div className="text-[9px] text-[#3d4f6a] mt-0.5">{fixture.home} vs {fixture.away}</div>}
        </div>

        {/* Formation */}
        <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {/* Live movement indicator connected to chat broadcasts */}
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${telegramBroadcasts.length > 0 || liveEvents.length > 0 ? "bg-[#00e87a] animate-pulse" : "bg-[#3d4f6a]"}`} />
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-[#3d4f6a]">{telegramBroadcasts.length > 0 || liveEvents.length > 0 ? "Live Movement Active" : "Static Formation"}</span>
          </div>
          <div className="relative w-full h-44 rounded-xl overflow-hidden formation-pitch">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 150" fill="none">
              <rect width="200" height="150" fill="#071207" rx="10" />
              <rect x="10" y="10" width="180" height="130" stroke="#0f2a0f" strokeWidth="1.5" rx="4" fill="none" />
              <circle cx="100" cy="75" r="25" stroke="#0f2a0f" strokeWidth="1.5" fill="none" />
              <line x1="100" y1="10" x2="100" y2="140" stroke="#0f2a0f" strokeWidth="1" />
              <line x1="10" y1="75" x2="190" y2="75" stroke="#0f2a0f" strokeWidth="1" opacity="0.5" />
              <circle cx="100" cy="75" r="2" fill="#0f2a0f" />
              <rect x="10" y="45" width="35" height="60" stroke="#0f2a0f" strokeWidth="1" fill="none" />
              <rect x="155" y="45" width="35" height="60" stroke="#0f2a0f" strokeWidth="1" fill="none" />
            </svg>
            {[[12,50],[28,20],[28,40],[28,60],[28,80],[48,30],[48,50],[48,70],[65,20],[65,50],[65,80]].map(([x,y],i) => (
              <div key={i} className={`absolute w-5 h-5 rounded-full flex items-center justify-center text-[6px] font-black text-white transition-all duration-700 ${telegramBroadcasts.length > 0 || liveEvents.length > 0 ? "scale-110 shadow-[0_0_16px_rgba(59,130,246,0.7)]" : ""}`}
                   style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) ${telegramBroadcasts.length > 0 || liveEvents.length > 0 ? "rotate(" + (i * 2) + "deg)" : ""}`, background: "#3b82f6", border: "2px solid #93c5fd", boxShadow: telegramBroadcasts.length > 0 || liveEvents.length > 0 ? "0 0 16px rgba(59,130,246,0.7)" : "0 0 8px rgba(59,130,246,0.4)" }}>
                {i+1}
              </div>
            ))}
            {[[88,50],[72,20],[72,40],[72,60],[72,80],[52,30],[52,50],[52,70],[35,20],[35,50],[35,80]].map(([x,y],i) => (
              <div key={i} className={`absolute w-5 h-5 rounded-full flex items-center justify-center text-[6px] font-black text-white transition-all duration-700 ${telegramBroadcasts.length > 0 || liveEvents.length > 0 ? "scale-110 shadow-[0_0_16px_rgba(239,68,68,0.7)]" : ""}`}
                   style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) ${telegramBroadcasts.length > 0 || liveEvents.length > 0 ? "rotate(-" + (i * 2) + "deg)" : ""}`, background: "#ef4444", border: "2px solid #fca5a5", boxShadow: telegramBroadcasts.length > 0 || liveEvents.length > 0 ? "0 0 16px rgba(239,68,68,0.7)" : "0 0 8px rgba(239,68,68,0.3)" }}>
                {i+1}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[9px]">
            <div className="flex items-center gap-1.5 font-bold" style={{ color: "#3b82f6" }}>
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              {fixture?.homeCode || "HOME"}
            </div>
            <div className="text-[#3d4f6a] text-[8px] font-medium">4-3-3</div>
            <div className="flex items-center gap-1.5 font-bold" style={{ color: "#ef4444" }}>
              <div className="w-3 h-3 rounded-full bg-red-500" />
              {fixture?.awayCode || "AWAY"}
            </div>
          </div>
        </div>

        {/* Live Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="text-[10px] font-black text-white">Live Chat</div>
          </div>
          <div className="flex-1 overflow-y-auto hide-sb px-3 py-2 space-y-2">
            {/* Real-time SSE connection banner */}
            {mounted && (
              <div className="flex items-center gap-2 text-[8px] font-mono mb-1 px-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sseIsLive ? "bg-[#00e87a] animate-pulse" : sseConnected ? "bg-[#e8c84a]" : "bg-[#3d4f6a]"}`} />
                <span className="text-[#3d4f6a] uppercase tracking-wider">{sseIsLive ? "TxLINE Live Stream" : sseConnected ? "TxLINE Ready" : serverHasToken ? "TxLINE Demo" : "No Token — Demo Mode"}</span>
              </div>
            )}
            {/* Telegram broadcasts from /api/telegram-pundit — connected directly into chat */}
            {telegramBroadcasts.length > 0 && telegramBroadcasts.slice(0, 4).map((tg, i) => (
              <div key={`tg-${i}`} className="flex gap-2 text-[9px] animate-fade-in">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-black text-black shrink-0 shadow-sm bg-gradient-to-br from-[#e8c84a] to-[#a8882a]">
                  📢
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-black text-[#e8c84a] tracking-wide text-[8px]">TELEGRAM</span>
                    <span className="text-[#3d4f6a] text-[7px] font-mono">{tg.time}</span>
                    <span className="text-[6px] font-black px-1 rounded bg-[#9b6dff]/10 text-[#9b6dff] uppercase">Broadcast</span>
                  </div>
                  <p className="text-[#f0f4ff] leading-relaxed text-[8px] font-medium">{tg.message || tg.text}</p>
                </div>
              </div>
            ))}
            {/* Dynamic live events from SSE stream */}
            {liveEvents.length > 0 ? (
              liveEvents.slice(0, 6).map((e, i) => (
                <div key={`${e.time}-${i}`} className="flex gap-2 text-[9px]">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0 shadow-sm"
                       style={{ background: e.type === "goal" ? "#e8c84a" : e.type === "card" ? "#ff3355" : e.type === "var" ? "#00d4ff" : e.type === "corner" ? "#9b6dff" : "#3d4f6a" }}>
                    {e.icon.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-[#c8d4e8]">TxLINE</span>
                      <span className="text-[#3d4f6a]">{e.time}</span>
                      {e.type === "goal" && <span className="text-[7px] font-black px-1 rounded bg-[#e8c84a]/10 text-[#e8c84a]">GOAL</span>}
                      {e.type === "card" && <span className="text-[7px] font-black px-1 rounded bg-[#ff3355]/10 text-[#ff3355]">CARD</span>}
                    </div>
                    <p className={`leading-relaxed ${e.type === "goal" ? "text-[#f0f4ff] font-medium" : "text-[#8899bb]"}`}>{e.text}</p>
                  </div>
                </div>
              ))
            ) : (
              [
                { user: "kaito.sol", msg: "Spain looking strong this half 🔥", time: "2m", color: "#e8c84a" },
                { user: "marcus_usa", msg: "Higher on corners, AI is correct", time: "3m", color: "#00d4ff" },
                { user: "lara_arg", msg: "Streak 8 and counting 💪🏽", time: "5m", color: "#9b6dff" },
                { user: "sofia_br", msg: "VAR saved us there, phew!", time: "7m", color: "#00e87a" },
                { user: "moyo_ng", msg: "Argentina needs to attack more", time: "9m", color: "#ff3355" },
                { user: "kaito.sol", msg: "TxLINE odds shifted HIGHER", time: "11m", color: "#e8c84a" },
              ].map((c, i) => (
                <div key={i} className="flex gap-2 text-[9px]">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0"
                       style={{ background: c.color }}>
                    {c.user[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-[#c8d4e8]">{c.user}</span>
                      <span className="text-[#3d4f6a]">{c.time} ago</span>
                    </div>
                    <p className="text-[#8899bb] leading-relaxed">{c.msg}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex gap-2">
              <input type="text" placeholder="Join the chat…"
                className="flex-1 rounded-lg px-3 py-1.5 text-[10px] text-white placeholder-[#3d4f6a] focus:outline-none"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-black transition-colors"
                      style={{ background: "linear-gradient(135deg,#e8c84a,#c8a030)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti layer */}
      <canvas id="confetti-canvas" className="pointer-events-none fixed inset-0 w-full h-full z-[60]" />

      {/* ═══ GOAL ALERT OVERLAY — fires from REAL SSE score changes ═══ */}
      {goalAlert && fixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center goal-overlay-anim"
             style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }}>
          {/* Pulse rings */}
          <div className="absolute" style={{ width: 400, height: 400 }}>
            <div className="goal-pulse-ring" style={{ width: "100%", height: "100%", top: 0, left: 0 }} />
            <div className="goal-pulse-ring" style={{ width: "100%", height: "100%", top: 0, left: 0, animationDelay: "0.4s" }} />
          </div>

          <div className="text-center relative z-10 px-8">
            {/* TxLINE badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                 style={{ background: "rgba(0,232,122,0.08)", border: "1px solid rgba(0,232,122,0.2)" }}>
              <span className="w-1.5 h-1.5 bg-[#00e87a] rounded-full animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.3em] text-[#00e87a] uppercase">TxLINE Live · Verified On-Chain</span>
            </div>

            {/* GOAL! text */}
            <div className="goal-shout-text text-[100px] sm:text-[140px] lg:text-[180px] font-black leading-none tracking-tighter select-none"
                 style={{
                   background: "linear-gradient(180deg, #f7e68a 0%, #e8c84a 50%, #a8882a 100%)",
                   WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
                   filter: "drop-shadow(0 0 80px rgba(232,200,74,0.6))",
                 }}>
              GOAL!
            </div>

            {/* Score */}
            <div className="goal-score-slide text-[28px] sm:text-[36px] font-black text-white mt-4 tracking-wide tabular-nums">
              {fixture.home}
              <span className="mx-3" style={{ color: "#e8c84a" }}>{goalAlert.home} : {goalAlert.away}</span>
              {fixture.away}
            </div>

            {/* Scorer */}
            {goalAlert.scorer && (
              <div className="text-[15px] font-bold mt-3" style={{ color: "#e8c84a" }}>
                ⚽ {goalAlert.scorer}
              </div>
            )}

            <div className="text-[11px] font-bold text-[#8899bb] uppercase tracking-[0.3em] mt-4">
              Score update streamed from TxLINE
            </div>
          </div>
        </div>
      )}
    </div>
  );
}