"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchFixtures, STATS, getReplayValue, getOddsSpark, flagUrl, type Fixture, type StatKey } from "@/lib/txline-client";
import { getPunditTake, speakPundit, stopSpeak, type PunditTake } from "@/lib/ai-pundit";
import MatchRail from "./MatchRail";
import Leaderboard from "./Leaderboard";

type Round = { fixture: Fixture; statKey: StatKey; statLabel: string; unit: string; lastValue: number; step: number; };

function Sparkline({ data, up }: { data: number[]; up?: boolean }) {
  const w = 130, h = 36, pad = 3;
  const min = Math.min(...data), max = Math.max(...data), range = Math.max(0.1, max - min);
  const pts = data.map((v, i) => `${pad + (i / (data.length - 1)) * (w - pad * 2)},${h - pad - ((v - min) / range) * (h - pad * 2)}`).join(" ");
  const lastX = w - pad, lastY = h - pad - ((data[data.length - 1] - min) / range) * (h - pad * 2);
  const color = up === false ? "#ef4444" : up === true ? "#22c55e" : "#64748b";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs><linearGradient id={`spg-${up}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon fill={`url(#spg-${up})`} points={`${pad},${h} ${pts} ${w-pad},${h}`}/>
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lastX} cy={lastY} r="3.5" fill={color}/>
    </svg>
  );
}

const STAT_ICONS: Record<StatKey, string> = { corners: "CRN", shots: "SHT", shots_on_target: "SOT", possession_home: "POS", fouls: "FLS", attacks: "ATK" };

export default function StreakGame({ externalFixtureId, hideLeaderboard }: { externalFixtureId?: number | null; hideLeaderboard?: boolean }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [source, setSource] = useState<"txline_live"|"txline_replay"|"demo">("demo");
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [guess, setGuess] = useState<"hi"|"lo"|null>(null);
  const [nextValue, setNextValue] = useState<number | null>(null);
  const [result, setResult] = useState<"win"|"lose"|"push"|null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [pundit, setPundit] = useState<PunditTake | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    fetchFixtures().then(({ fixtures, source }) => { setFixtures(fixtures); setSource(source as any); if (fixtures[0] && !fixture) setFixture(fixtures[0]); });
    setBest(parseInt(localStorage.getItem("streakline_best") || "0"));
    setStreak(parseInt(localStorage.getItem("streakline_current") || "0"));
  }, []);

  useEffect(() => {
    if (externalFixtureId && fixtures.length) {
      const f = fixtures.find(x => x.fixtureId === externalFixtureId);
      if (f) { setFixture(f); setRound(null); }
    }
  }, [externalFixtureId, fixtures]);

  const newRound = (f = fixture) => {
    if (!f) return;
    const stat = STATS[Math.floor(Math.random() * STATS.length)];
    const step = 3 + Math.floor(Math.random() * 5);
    setRound({ fixture: f, statKey: stat.key, statLabel: stat.label, unit: stat.unit, lastValue: getReplayValue(stat.key, step), step });
    setGuess(null); setNextValue(null); setResult(null);
    stopSpeak();
    setPundit(getPunditTake(stat.key, getReplayValue(stat.key, step), f.homeCode, f.awayCode, f.minute));
  };

  useEffect(() => { if (fixture && !round) newRound(fixture); }, [fixture]);
  const spark = useMemo(() => round ? getOddsSpark(round.statKey, round.step) : [], [round?.statKey, round?.step]);

  const makeGuess = (dir: "hi" | "lo") => {
    if (!round || guess) return;
    setGuess(dir);
    setTimeout(() => {
      const nv = getReplayValue(round.statKey, round.step + 1 + Math.floor(Math.random() * 2));
      setNextValue(nv);
      let res: "win"|"lose"|"push" = "push";
      if (nv > round.lastValue) res = dir === "hi" ? "win" : "lose";
      else if (nv < round.lastValue) res = dir === "lo" ? "win" : "lose";
      setResult(res);
      if (res === "win") { const ns = streak + 1; setStreak(ns); localStorage.setItem("streakline_current", String(ns)); if (ns > best) { setBest(ns); localStorage.setItem("streakline_best", String(ns)); } }
      else if (res === "lose") { setStreak(0); localStorage.setItem("streakline_current", "0"); }
    }, 1100);
  };

  const onTS = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTE = (e: React.TouchEvent) => { if (touchX.current == null || guess) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 50) makeGuess(dx > 0 ? "hi" : "lo"); touchX.current = null; };
  const toggleSpeak = () => { if (speaking) { stopSpeak(); setSpeaking(false); return; } if (pundit) setSpeaking(speakPundit(pundit.audible, () => setSpeaking(false))); };

  const shareStreak = async () => {
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1080;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0,0,1080,1080); g.addColorStop(0,"#100c08"); g.addColorStop(1,"#14120e");
    ctx.fillStyle = g; ctx.fillRect(0,0,1080,1080);
    ctx.fillStyle = "rgba(196,164,78,0.06)"; ctx.beginPath(); ctx.arc(540,380,280,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#c4a44e"; ctx.font = "bold 32px system-ui,sans-serif"; ctx.fillText("STREAKLINE",80,100);
    ctx.fillStyle = "#5a5040"; ctx.font = "24px system-ui,sans-serif"; ctx.fillText("World Cup 2026 — Powered by TxLINE",80,140);
    ctx.fillStyle = "#f0ebe0"; ctx.font = "bold 200px system-ui,sans-serif"; ctx.fillText(String(Math.max(streak,best)),80,440);
    ctx.fillStyle = "#7a7060"; ctx.font = "48px system-ui,sans-serif"; ctx.fillText("win streak",80,510);
    if (round) { ctx.fillStyle = "#8a7e6e"; ctx.font = "34px system-ui,sans-serif"; ctx.fillText(`${round.fixture.home} vs ${round.fixture.away}`,80,620); }
    ctx.fillStyle = "#3a3228"; ctx.font = "26px system-ui,sans-serif"; ctx.fillText("streakline.app — Hi-Lo World Cup stats game",80,980);
    c.toBlob(async b => { if (!b) return; const f = new File([b],"streakline.png",{type:"image/png"}); try { if ((navigator as any).canShare?.({files:[f]})) { await (navigator as any).share({files:[f],title:"StreakLINE"}); return; } } catch{} const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download="streakline.png"; a.click(); URL.revokeObjectURL(u); },"image/png");
  };

  if (!round || !fixture) return (
    <div className="rounded-2xl card p-10 text-center">
      <div className="w-7 h-7 border-2 border-[#c4a44e] border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
      <p className="text-[10px] text-[#5a5040] uppercase tracking-wider">Loading World Cup fixtures</p>
    </div>
  );

  const f = round.fixture;
  const srcLabel = source === "txline_live" ? "TxLINE Live" : source === "txline_replay" ? "TxLINE Replay" : "Demo";
  const diff = nextValue !== null ? nextValue - round.lastValue : null;

  return (
    <div className="w-full space-y-3">
      <MatchRail fixtures={fixtures} activeId={f.fixtureId} onPick={fx => { setFixture(fx); setRound(null); }} />

      {/* Source bar */}
      <div className="flex items-center justify-between px-1 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="live-dot"/><span className="font-semibold text-[#d4c9b0]">{srcLabel}</span>
          <span className="text-[#3a3228]">·</span><span className="text-[#5a5040]">{f.status}{f.minute ? ` ${f.minute}'` : ""}</span>
        </div>
        <span className="text-[#5a5040] font-medium">{f.competition || "World Cup 2026"}</span>
      </div>

      {/* ═══ MAIN GAME CARD ═══ */}
      <div className="rounded-3xl card card-shine  overflow-hidden" onTouchStart={onTS} onTouchEnd={onTE}>
        {/* Teams header with gradient top */}
        <div className="relative px-6 pt-6 pb-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#c4a44e]/5 to-transparent pointer-events-none"/>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={flagUrl(f.homeCode||f.home,80)} alt={f.home} width={42} height={28} className="rounded-lg shadow-lg shadow-black/40 object-cover ring-1 ring-[#2a2420]/40" loading="lazy"/>
              <div>
                <div className="text-[10px] font-semibold tracking-widest text-[#5a5040]">{(f.homeCode||f.home).slice(0,3).toUpperCase()}</div>
                <div className="text-[15px] font-bold text-[#f0ebe0]">{f.home}</div>
              </div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl font-extrabold tabular-nums text-[#f0ebe0]">{f.homeScore??0}<span className="text-[#3a3228] mx-1.5 font-light">:</span>{f.awayScore??0}</div>
              <div className="text-[9px] font-bold tracking-widest text-[#5a5040] mt-0.5">{f.status || "LIVE"}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-semibold tracking-widest text-[#5a5040]">{(f.awayCode||f.away).slice(0,3).toUpperCase()}</div>
                <div className="text-[15px] font-bold text-[#f0ebe0]">{f.away}</div>
              </div>
              <img src={flagUrl(f.awayCode||f.away,80)} alt={f.away} width={42} height={28} className="rounded-lg shadow-lg shadow-black/40 object-cover ring-1 ring-[#2a2420]/40" loading="lazy"/>
            </div>
          </div>
        </div>

        {/* Stat panel */}
        <div className="mx-3 mb-3 rounded-2xl bg-[#1a1610]/60 border border-[#2a2420]/40 overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-start justify-between anim-up">
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-black tracking-widest text-[#c4a44e]/50 bg-[#c4a44e]/8 px-1.5 py-0.5 rounded">{STAT_ICONS[round.statKey]}</span>
              <div>
                <div className="text-[9px] font-bold tracking-widest text-[#5a5040]">NEXT TXLINE UPDATE</div>
                <div className="text-xl font-extrabold text-[#f0ebe0] mt-0.5">{round.statLabel}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold tracking-widest text-[#5a5040]">MARKET</div>
              <div className="mt-1"><Sparkline data={spark} up={pundit?.direction === "hi"}/></div>
            </div>
          </div>

          <div className="px-5 pb-4 flex items-end gap-8 anim-up anim-d1">
            <div>
              <div className="text-[9px] font-bold tracking-widest text-[#5a5040]">CURRENT</div>
              <div className="text-5xl font-black tracking-tighter leading-none text-[#f0ebe0] mt-1">{round.lastValue}<span className="text-lg font-semibold text-[#5a5040] ml-0.5">{round.unit}</span></div>
            </div>
            <div className="pb-1.5 flex-1 min-h-[48px]">
              <div className="text-[9px] font-bold tracking-widest text-[#5a5040]">NEXT</div>
              <div className="text-sm font-semibold mt-1.5">
                {nextValue === null ? (guess
                  ? <span className="text-blue-400 flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>Waiting for TxLINE…</span>
                  : <span className="text-[#5a5040]">Will it go higher or lower?</span>
                ) : (
                  <span className={`anim-pop inline-flex items-center gap-1.5 text-base font-bold ${result==="win"?"text-emerald-400":result==="lose"?"text-red-400":"text-[#8a7e6e]"}`}>
                    {nextValue}{round.unit} <span className="text-xs">{diff!>0?`↑ ${diff}`:diff!<0?`↓ ${Math.abs(diff!)}`:"="}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AI Pundit with confidence meter */}
          {pundit && !result && (
            <div className="mx-4 mb-4 rounded-xl bg-[#1a1610]/60 border border-[#2a2420]/50 overflow-hidden anim-up anim-d2">
              <div className="px-3.5 pt-3 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm shadow-[#c4a44e]/15">
                      <span className="text-[8px] font-black text-[#f0ebe0]">AI</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#d4c9b0]">AI Pundit</span>
                  </div>
                  <button onClick={toggleSpeak} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${speaking?"bg-blue-600 text-[#f0ebe0] shadow-lg shadow-[#c4a44e]/20":"bg-[#2a2420]/50 text-[#8a7e6e] hover:bg-[#2a2420]/80"}`}>
                    <span className="text-[10px]">{speaking?"■":"▶"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-[#2a2420]/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${pundit.confidence>=65?"bg-gradient-to-r from-emerald-500 to-emerald-400":pundit.confidence>=55?"bg-gradient-to-r from-blue-500 to-blue-400":"bg-gradient-to-r from-amber-500 to-amber-400"}`}
                      style={{width:`${pundit.confidence}%`}}/>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-lg font-black tabular-nums ${pundit.confidence>=65?"text-emerald-400":pundit.confidence>=55?"text-blue-400":"text-amber-400"}`}>{pundit.confidence}%</span>
                    <span className={`text-[9px] font-bold ${pundit.direction==="hi"?"text-emerald-400":pundit.direction==="lo"?"text-red-400":"text-[#5a5040]"}`}>
                      {pundit.direction==="hi"?"HIGHER":pundit.direction==="lo"?"LOWER":"EVEN"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-3.5 pb-3 text-[11px] leading-relaxed text-[#8a7e6e]">{pundit.text}</div>
            </div>
          )}
        </div>

        {/* Swipe hint */}
        <div className="px-4 pb-1 text-center text-[10px] text-[#3a3228] md:hidden">← Lower · Higher →</div>

        {/* Buttons */}
        <div className="px-3 pb-3 grid grid-cols-2 gap-2.5">
          <button onClick={() => makeGuess("lo")} disabled={!!guess}
            className={`h-14 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.97] ${
              guess==="lo" ? "bg-red-500 text-[#f0ebe0] shadow-lg shadow-red-500/30"
              : "bg-[#2a2420]/40 hover:bg-red-500/10 text-[#e0d8c8] border border-[#2a2420]/60 hover:border-red-500/20"
            } disabled:opacity-50`}>
            <span className="flex items-center justify-center gap-2"><span className="text-lg">↓</span> Lower</span>
          </button>
          <button onClick={() => makeGuess("hi")} disabled={!!guess}
            className={`h-14 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.97] ${
              guess==="hi" ? "bg-emerald-500 text-[#f0ebe0] shadow-lg shadow-emerald-500/30"
              : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-[#f0ebe0] shadow-lg shadow-[#c4a44e]/15"
            } disabled:opacity-50`}>
            <span className="flex items-center justify-center gap-2">Higher <span className="text-lg">↑</span></span>
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`mx-3 mb-3 rounded-2xl px-4 py-3.5 flex items-center justify-between anim-pop ${
            result==="win"?"bg-emerald-500/10 border border-emerald-500/20":result==="lose"?"bg-red-500/10 border border-red-500/20":"bg-[#1a1610]/40 border border-[#2a2420]/50"
          }`}>
            <div>
              <div className={`text-sm font-bold ${result==="win"?"text-emerald-400":result==="lose"?"text-red-400":"text-[#d4c9b0]"}`}>
                {result==="win"?`Correct! Streak ${streak}`:result==="lose"?"Wrong — streak reset":"Push — streak holds"}
              </div>
              {result==="win"&&streak>=3&&<div className="text-[10px] text-emerald-500/60 font-medium mt-0.5 uppercase tracking-wider">{streak>=10?"Legendary run":streak>=7?"On fire":streak>=5?"Hot streak":"Keep going"}</div>}
            </div>
            <button onClick={() => newRound()} className="text-xs font-bold px-4 py-2 rounded-xl bg-[#2a2420]/60 hover:bg-[#2a2420] text-[#f0ebe0] border border-[#2a2420]/60 transition-all">Next →</button>
          </div>
        )}
      </div>

      {/* Streak bar */}
      <div className="rounded-2xl card px-5 py-4 flex items-center justify-between">
        <div className="flex gap-8">
          <div><div className="text-[9px] font-bold tracking-widest text-[#5a5040]">STREAK</div><div className={`text-3xl font-black tabular-nums ${streak>=5?"text-[#c4a44e] streak-glow":"text-[#f0ebe0]"}`}>{streak}</div></div>
          <div><div className="text-[9px] font-bold tracking-widest text-[#5a5040]">BEST</div><div className="text-3xl font-black tabular-nums text-[#5a5040]">{best}</div></div>
        </div>
        <button onClick={shareStreak} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#2a2420]/50 hover:bg-[#2a2420]/80 text-[#d4c9b0] border border-[#2a2420]/60 transition-all">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          Share
        </button>
      </div>

      {!hideLeaderboard && <Leaderboard currentStreak={streak}/>}
      <p className="text-[9px] text-[#3a3228] text-center px-4 pb-2 tracking-wider uppercase">Stats via TxLINE — FIFA World Cup 2026 — Solana devnet — No real-money wagering</p>
    </div>
  );
}
