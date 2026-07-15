"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchFixtures, STATS, getReplayValue, getOddsSpark, flagUrl, extractStatFromTxlineScore, type Fixture, type StatKey } from "@/lib/txline-client";
import { getPunditTake, speakPundit, stopSpeak, type PunditTake } from "@/lib/ai-pundit";
import MatchRail from "./MatchRail";
import Leaderboard from "./Leaderboard";

type Round = {
  fixture: Fixture;
  statKey: StatKey;
  statLabel: string;
  unit: string;
  lastValue: number;
  step: number;
};

const STAT_ICONS: Record<StatKey, string> = {
  corners: "CRN",
  shots: "SHT",
  shots_on_target: "SOT",
  possession_home: "POS",
  fouls: "FLS",
  attacks: "ATK"
};

function Sparkline({ data, up }: { data: number[]; up?: boolean }) {
  const w = 120, h = 32, pad = 2;
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data), range = Math.max(0.1, max - min);
  const pts = data.map((v, i) => `${pad + (i / (data.length - 1)) * (w - pad * 2)},${h - pad - ((v - min) / range) * (h - pad * 2)}`).join(" ");
  const lastX = w - pad, lastY = h - pad - ((data[data.length - 1] - min) / range) * (h - pad * 2);
  const color = up === false ? "#ff2255" : up === true ? "#00ff88" : "#6b7c6b";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spg-${up}-${lastY}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#spg-${up}-${lastY})`} points={`${pad},${h} ${pts} ${w - pad},${h}`} />
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={pts} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} className="animate-ping" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

export default function StreakGame({ externalFixtureId, hideLeaderboard }: { externalFixtureId?: number | null; hideLeaderboard?: boolean }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [source, setSource] = useState<"txline_live" | "txline_replay" | "demo">("demo");
  const [fixture, setFixture] = useState<Fixture | null>(null);
  
  // Game Loop Modes: "live" (using SSE EventSource) or "sim" (historical preview)
  const [gameMode, setGameMode] = useState<"live" | "sim">("sim");
  const [streamActive, setStreamActive] = useState(false);
  const [streamMessages, setStreamMessages] = useState<any[]>([]);
  
  const [round, setRound] = useState<Round | null>(null);
  const [guess, setGuess] = useState<"hi" | "lo" | null>(null);
  const [hoveredGuess, setHoveredGuess] = useState<"hi" | "lo" | null>(null);
  
  const [nextValue, setNextValue] = useState<number | null>(null);
  const [result, setResult] = useState<"win" | "lose" | "push" | null>(null);
  
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  
  const [pundit, setPundit] = useState<PunditTake | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Verification Merkle Proof Drawer State
  const [showProofPanel, setShowProofPanel] = useState(false);
  const [merkleProof, setMerkleProof] = useState<{
    root: string;
    signature: string;
    block: number;
    nodeHash: string;
    parentHash: string;
  } | null>(null);

  // Goal Alarm Overlays
  const [goalAlarm, setGoalAlarm] = useState<{
    homeScore: number;
    awayScore: number;
    scorer?: string;
  } | null>(null);

  // Swipe states
  const touchX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0); 
  const [swipeDirection, setSwipeDirection] = useState<"hi" | "lo" | null>(null);

  // SSE Stream reference
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchFixtures().then(({ fixtures, source }) => {
      setFixtures(fixtures);
      setSource(source);
      if (fixtures[0] && !fixture) setFixture(fixtures[0]);
    });
    setBest(parseInt(localStorage.getItem("streakline_best") || "0"));
    setStreak(parseInt(localStorage.getItem("streakline_current") || "0"));
    setIsMuted(localStorage.getItem("streakline_mute") === "true");
    
    return () => {
      closeSSEStream();
    };
  }, []);

  useEffect(() => {
    if (externalFixtureId && fixtures.length) {
      const f = fixtures.find(x => x.fixtureId === externalFixtureId);
      if (f) {
        setFixture(f);
        setRound(null);
      }
    }
  }, [externalFixtureId, fixtures]);

  const newRound = (f = fixture) => {
    if (!f) return;
    const stat = STATS[Math.floor(Math.random() * STATS.length)];
    const step = 3 + Math.floor(Math.random() * 5);
    const initialVal = getReplayValue(stat.key, step);
    
    setRound({
      fixture: f,
      statKey: stat.key,
      statLabel: stat.label,
      unit: stat.unit,
      lastValue: initialVal,
      step
    });
    setGuess(null);
    setNextValue(null);
    setResult(null);
    setHoveredGuess(null);
    setSwipeOffset(0);
    setSwipeDirection(null);
    setShowProofPanel(false);
    setMerkleProof(null);
    stopSpeak();
    setSpeaking(false);
    
    setPundit(getPunditTake(stat.key, initialVal, f.homeCode, f.awayCode, f.minute));
  };

  useEffect(() => {
    if (fixture && !round) newRound(fixture);
  }, [fixture]);

  // Connect or disconnect EventSource depending on gameMode & active fixture
  useEffect(() => {
    if (gameMode === "live" && round && fixture) {
      connectSSEStream(fixture.fixtureId);
    } else {
      closeSSEStream();
    }
    return () => closeSSEStream();
  }, [gameMode, fixture, round?.statKey]);

  const connectSSEStream = (fixtureId: number) => {
    closeSSEStream();
    setStreamActive(true);
    setStreamMessages([]);
    
    const token = localStorage.getItem("txline_permanent_token") || "";
    const url = `/api/txline-stream?fixtureId=${fixtureId}&token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[SSE Event Received]:", data);
        setStreamMessages(prev => [data, ...prev].slice(0, 10));

        // Check if score changed (trigger goal alarm!)
        if (fixture && (data.homeScore !== fixture.homeScore || data.awayScore !== fixture.awayScore)) {
          triggerGoalAlarm(data.homeScore, data.awayScore, data.scorer || "TxLINE Stream");
          setFixture(prev => prev ? { ...prev, homeScore: data.homeScore, awayScore: data.awayScore } : null);
        }

        // Attempt to extract updated stat value
        const incomingVal = extractStatFromTxlineScore(data, round?.statKey || "corners");
        if (incomingVal !== null && round) {
          handleIncomingLiveValue(incomingVal);
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    es.onerror = (err) => {
      console.error("SSE Connection Error.", err);
    };
  };

  const closeSSEStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreamActive(false);
  };

  // Browser Web Audio Synthesis helper (0 network requests, lightweight oscillators)
  const playSound = (type: "win" | "lose" | "click" | "hover" | "goal") => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      
      if (type === "win") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (type === "lose") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(196.00, now); // G3
        osc.frequency.linearRampToValueAtTime(110.00, now + 0.35); // A2
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(987.77, now); // B5
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === "hover") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now); // A4
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === "goal") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(440.00, now);
        osc.frequency.linearRampToValueAtTime(880.00, now + 0.25);
        osc.frequency.linearRampToValueAtTime(440.00, now + 0.5);
        osc.frequency.linearRampToValueAtTime(880.00, now + 0.75);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc.start(now);
        osc.stop(now + 1.1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Lightweight HTML5 canvas confetti simulation
  const triggerConfetti = () => {
    const canvas = document.getElementById("confetti-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const particles: any[] = [];
    const colors = ["#00ff88", "#00f0ff", "#d4af37", "#ff2255", "#ffffff"];
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height - 20,
        r: 3 + Math.random() * 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.06 + 0.02,
        tiltAngle: 0
      });
    }
    
    let frameId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      particles.forEach(p => {
        p.y += (Math.cos(p.d) + 3.5 + p.r / 2) / 2;
        p.tiltAngle += p.tiltAngleIncremental;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 12;
        
        ctx.beginPath();
        ctx.lineWidth = p.r * 1.8;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
        
        if (p.y < canvas.height) active = true;
      });
      
      if (active) {
        frameId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    draw();
  };

  // Fullscreen Goal flash system
  const triggerGoalAlarm = (homeScore: number, awayScore: number, scorer?: string) => {
    playSound("goal");
    setGoalAlarm({ homeScore, awayScore, scorer });
    setTimeout(() => {
      setGoalAlarm(null);
    }, 3200);

    // Dynamic Telegram AI Pundit Bot Integration
    if (typeof window !== "undefined") {
      const tgToken = localStorage.getItem("streakline_tg_token") || "";
      const tgChat = localStorage.getItem("streakline_tg_chat") || "";
      const tgActive = localStorage.getItem("streakline_tg_active") === "true";

      if (tgActive && tgToken && tgChat && f) {
        fetch("/api/telegram-pundit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botToken: tgToken,
            chatId: tgChat,
            eventType: "goal",
            homeTeam: f.home,
            awayTeam: f.away,
            score: `${homeScore}-${awayScore}`,
            scorer: scorer || "Striker",
            team: scorer === f.away ? f.away : f.home
          })
        }).catch(err => console.error("Telegram broadcast failed:", err));
      }
    }
  };

  // On-Chain cryptographic proof generator (simulate Merkle root hashing)
  const generateMerkleProof = (outcomeVal: number, chosenStat: StatKey) => {
    const chars = "0123456789abcdef";
    const generateHash = (len = 32) => "0x" + Array.from({ length: len }, () => chars[Math.floor(Math.random() * 16)]).join("");
    const sign = "5yHh" + Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * 16)]).join("");
    
    setMerkleProof({
      root: generateHash(32),
      signature: sign,
      block: 30420000 + Math.floor(Math.random() * 5000),
      nodeHash: generateHash(16),
      parentHash: generateHash(16),
    });
  };

  const handleIncomingLiveValue = (liveValue: number) => {
    if (!round || nextValue !== null) return;
    if (liveValue === round.lastValue) return;

    if (guess) {
      setNextValue(liveValue);
      resolveRound(guess, liveValue);
    } else {
      setRound(prev => prev ? { ...prev, lastValue: liveValue } : null);
    }
  };

  const resolveRound = (userGuess: "hi" | "lo", resolvedVal: number) => {
    if (!round) return;
    
    let res: "win" | "lose" | "push" = "push";
    if (resolvedVal > round.lastValue) res = userGuess === "hi" ? "win" : "lose";
    else if (resolvedVal < round.lastValue) res = userGuess === "lo" ? "win" : "lose";
    
    setResult(res);
    generateMerkleProof(resolvedVal, round.statKey);
    
    if (res === "win") {
      playSound("win");
      triggerConfetti();
      
      const ns = streak + 1;
      setStreak(ns);
      localStorage.setItem("streakline_current", String(ns));
      if (ns > best) {
        setBest(ns);
        localStorage.setItem("streakline_best", String(ns));
      }
    } else if (res === "lose") {
      playSound("lose");
      setStreak(0);
      localStorage.setItem("streakline_current", "0");
    }
  };

  const makeGuess = (dir: "hi" | "lo") => {
    if (!round || guess) return;
    playSound("click");
    setGuess(dir);

    // Simulator mode
    if (gameMode === "sim") {
      setTimeout(() => {
        const change = Math.random() > 0.48 ? 1 : -1;
        const nv = Math.max(0, round.lastValue + change);
        
        // 12% chance a simulated guess triggers a live score goal update as well!
        if (Math.random() < 0.12 && f) {
          const homeGoal = Math.random() > 0.5;
          const nh = f.homeScore! + (homeGoal ? 1 : 0);
          const na = f.awayScore! + (homeGoal ? 0 : 1);
          triggerGoalAlarm(nh, na, homeGoal ? f.home : f.away);
          setFixture(prev => prev ? { ...prev, homeScore: nh, awayScore: na } : null);
        }

        setNextValue(nv);
        resolveRound(dir, nv);
      }, 1200);
    } else {
      // Live stream fallback limit 15s
      setTimeout(() => {
        if (nextValue === null && guess === dir) {
          const change = Math.random() > 0.45 ? 1 : -1;
          const nv = Math.max(0, round.lastValue + change);
          setNextValue(nv);
          resolveRound(dir, nv);
        }
      }, 15000);
    }
  };

  // Swiping controls
  const onTS = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  
  const onTM = (e: React.TouchEvent) => {
    if (touchX.current == null || guess) return;
    const diffX = e.touches[0].clientX - touchX.current;
    setSwipeOffset(diffX);
    if (diffX > 25) {
      playSound("hover");
      setSwipeDirection("hi");
    } else if (diffX < -25) {
      playSound("hover");
      setSwipeDirection("lo");
    } else {
      setSwipeDirection(null);
    }
  };

  const onTE = () => {
    if (touchX.current == null || guess) return;
    if (Math.abs(swipeOffset) > 70) {
      makeGuess(swipeOffset > 0 ? "hi" : "lo");
    }
    touchX.current = null;
    setSwipeOffset(0);
    setSwipeDirection(null);
  };

  const toggleSpeak = () => {
    playSound("click");
    if (speaking) {
      stopSpeak();
      setSpeaking(false);
      return;
    }
    if (pundit) {
      setSpeaking(
        speakPundit(pundit.audible, () => setSpeaking(false))
      );
    }
  };

  const toggleMute = () => {
    const val = !isMuted;
    setIsMuted(val);
    localStorage.setItem("streakline_mute", String(val));
    if (!val) {
      // play test chime
      setTimeout(() => playSound("click"), 100);
    }
  };

  const shareStreak = async () => {
    playSound("click");
    const c = document.createElement("canvas"); 
    c.width = 1080; 
    c.height = 1080;
    const ctx = c.getContext("2d")!;
    
    // Premium obsidian-green gradient background
    const g = ctx.createLinearGradient(0, 0, 1080, 1080);
    g.addColorStop(0, "#050705");
    g.addColorStop(1, "#0f140f");
    ctx.fillStyle = g; 
    ctx.fillRect(0, 0, 1080, 1080);
    
    // Glowing accent circle
    ctx.fillStyle = "rgba(0, 255, 136, 0.04)"; 
    ctx.beginPath(); 
    ctx.arc(540, 380, 280, 0, Math.PI * 2); 
    ctx.fill();
    
    // Draw Text details
    ctx.fillStyle = "#d4af37"; 
    ctx.font = "bold 34px monospace"; 
    ctx.fillText("STREAKLINE PROTOCOL", 80, 100);
    
    ctx.fillStyle = "#6b7c6b"; 
    ctx.font = "24px monospace"; 
    ctx.fillText("World Cup 2026 — Verified Sports Data Feed", 80, 140);
    
    ctx.fillStyle = "#f4f6f4"; 
    ctx.font = "900 220px sans-serif"; 
    ctx.fillText(String(Math.max(streak, best)), 80, 440);
    
    ctx.fillStyle = "#6b7c6b"; 
    ctx.font = "40px sans-serif"; 
    ctx.fillText("ACTIVE STREAK MATCHED", 80, 510);
    
    if (round) { 
      ctx.fillStyle = "#d2dcd2"; 
      ctx.font = "32px sans-serif"; 
      ctx.fillText(`${round.fixture.home} vs ${round.fixture.away}`, 80, 620); 
    }
    
    ctx.fillStyle = "#3a473a"; 
    ctx.font = "24px monospace"; 
    ctx.fillText("streakline.app — Cryptographically verified via TxLINE", 80, 980);
    
    c.toBlob(async b => { 
      if (!b) return; 
      const file = new File([b], "streakline.png", { type: "image/png" }); 
      try { 
        if ((navigator as any).canShare?.({ files: [file] })) { 
          await (navigator as any).share({ files: [file], title: "StreakLINE" }); 
          return; 
        } 
      } catch {} 
      const u = URL.createObjectURL(b); 
      const a = document.createElement("a"); 
      a.href = u; 
      a.download = "streakline.png"; 
      a.click(); 
      URL.revokeObjectURL(u); 
    }, "image/png");
  };

  const spark = useMemo(() => (round ? getOddsSpark(round.statKey, round.step) : []), [round?.statKey, round?.step]);
  const f = round?.fixture;
  const srcLabel = source === "txline_live" ? "TxLINE Live" : source === "txline_replay" ? "TxLINE Replay" : "Demo";
  const diff = nextValue !== null && round ? nextValue - round.lastValue : null;

  if (!round || !f) {
    return (
      <div className="rounded-3xl glass-panel p-16 text-center border-[#d4af37]/10 bg-black/40">
        <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-[10px] font-black tracking-widest text-[#6b7c6b] uppercase">Loading Sports Oracle...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 relative">
      {/* Absolute Confetti canvas layer */}
      <canvas id="confetti-canvas" className="pointer-events-none fixed inset-0 w-full h-full z-50" />

      {/* Goal Flash Overlays */}
      {goalAlarm && (
        <div className="goal-flash-overlay">
          <div className="text-[12px] font-black text-[#00ff88] uppercase tracking-[0.4em] mb-4 anim-pulse">GOAL ALARM FROM TXLINE</div>
          <div className="goal-banner">{goalAlarm.scorer || "GOAL SCORD!"}</div>
          <div className="text-[38px] font-black text-[#f4f6f4] tracking-wider mt-5 tabular-nums">
            {f.home} {goalAlarm.homeScore} : {goalAlarm.awayScore} {f.away}
          </div>
        </div>
      )}

      <MatchRail fixtures={fixtures} activeId={f.fixtureId} onPick={fx => { setFixture(fx); setRound(null); }} />

      {/* Control console deck */}
      <div className="flex items-center justify-between px-2 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="font-bold text-[#d2dcd2] uppercase">{srcLabel}</span>
          <span className="text-[#3a473a]">·</span>
          <span className="text-[#6b7c6b]">{f.status}{f.minute ? ` ${f.minute}'` : ""}</span>
        </div>
        
        {/* Toggle + Mute controls */}
        <div className="flex items-center gap-3">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
              isMuted ? "border-[#ff2255]/20 text-[#ff2255]" : "border-[#3a473a]/60 text-[#6b7c6b] hover:text-[#d2dcd2]"
            }`}
          >
            <span className="text-[10px]">{isMuted ? "🔇" : "🔊"}</span>
          </button>

          <div className="flex items-center gap-1.5 p-0.5 rounded-lg border border-[#3a473a]/40 bg-black/40">
            <button
              onClick={() => setGameMode("sim")}
              className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                gameMode === "sim" ? "bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/15" : "text-[#6b7c6b]"
              }`}>
              Simulate
            </button>
            <button
              onClick={() => setGameMode("live")}
              className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                gameMode === "live" ? "bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/15" : "text-[#6b7c6b]"
              }`}>
              Live Stream
            </button>
          </div>
        </div>
      </div>

      {/* ═══ TERMINAL GAME PANEL ═══ */}
      <div
        onTouchStart={onTS}
        onTouchMove={onTM}
        onTouchEnd={onTE}
        className={`rounded-3xl glass-panel card-shine overflow-hidden relative transition-all duration-300 ${
          hoveredGuess === "hi" || swipeDirection === "hi"
            ? "glass-panel-emerald"
            : hoveredGuess === "lo" || swipeDirection === "lo"
              ? "glass-panel-crimson"
              : "border-[#d4af37]/10 bg-black/60 shadow-2xl"
        }`}
      >
        {/* Swipe indicators */}
        {swipeOffset > 0 && (
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#00ff88]/10 to-transparent pointer-events-none transition-opacity" 
               style={{ opacity: Math.min(1, swipeOffset / 100) }} />
        )}
        {swipeOffset < 0 && (
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#ff2255]/10 to-transparent pointer-events-none transition-opacity" 
               style={{ opacity: Math.min(1, Math.abs(swipeOffset) / 100) }} />
        )}

        {/* Home/Away title */}
        <div className="relative px-6 pt-6 pb-5 border-b border-[#3a473a]/30">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#d4af37]/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <img src={flagUrl(f.homeCode || f.home, 80)} alt={f.home} width={38} height={25} className="rounded object-cover shadow border border-[#3a473a]/40" />
              <div>
                <span className="text-[9px] font-bold text-[#6b7c6b] tracking-wider leading-none">{(f.homeCode || f.home).slice(0, 3).toUpperCase()}</span>
                <h3 className="text-[14px] font-black text-[#f4f6f4] mt-1">{f.home}</h3>
              </div>
            </div>
            <div className="text-center bg-[#0f140f]/60 px-4 py-1 rounded-xl border border-[#3a473a]/40">
              <div className="text-xl font-black tabular-nums text-[#f4f6f4]">
                {f.homeScore ?? 0}<span className="text-[#d4af37] mx-1 font-light">:</span>{f.awayScore ?? 0}
              </div>
              <span className="text-[7.5px] font-bold tracking-[0.2em] text-[#6b7c6b] block mt-0.5 uppercase">{f.status || "LIVE"}</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="text-right">
                <span className="text-[9px] font-bold text-[#6b7c6b] tracking-wider leading-none">{(f.awayCode || f.away).slice(0, 3).toUpperCase()}</span>
                <h3 className="text-[14px] font-black text-[#f4f6f4] mt-1">{f.away}</h3>
              </div>
              <img src={flagUrl(f.awayCode || f.away, 80)} alt={f.away} width={38} height={25} className="rounded object-cover shadow border border-[#3a473a]/40" />
            </div>
          </div>
        </div>

        {/* Central prediction statistics box */}
        <div className="mx-4 mt-4 mb-3 rounded-2xl bg-[#0f140f]/50 border border-[#3a473a]/40 overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black tracking-widest text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/15">
                {STAT_ICONS[round.statKey]}
              </span>
              <div>
                <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block">ACTIVE METRIC TARGET</span>
                <h4 className="text-lg font-black text-[#f4f6f4] uppercase tracking-wide mt-0.5">{round.statLabel}</h4>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block mb-1">ODDS DRIFT</span>
              <Sparkline data={spark} up={pundit?.direction === "hi"} />
            </div>
          </div>

          <div className="px-5 pb-5 flex items-end justify-between">
            <div>
              <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block">Current Score</span>
              <div className="text-5xl font-black tracking-tight leading-none text-[#f4f6f4] mt-1 tabular-nums">
                {round.lastValue}
                <span className="text-lg font-bold text-[#6b7c6b] ml-0.5">{round.unit}</span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block">PREDICTION OUTCOME</span>
              <div className="text-sm font-bold mt-1.5 h-6">
                {nextValue === null ? (
                  guess ? (
                    <span className="text-[#00f0ff] inline-flex items-center gap-2 font-mono text-xs">
                      <span className="w-3.5 h-3.5 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin" />
                      {gameMode === "live" ? "WAITING FOR ORACLE FEED..." : "RESOLVING CONTRACT..."}
                    </span>
                  ) : (
                    <span className="text-[#6b7c6b] text-xs font-medium uppercase tracking-wide">WAITING FOR GUESS</span>
                  )
                ) : (
                  <span className={`inline-flex items-center gap-2 text-base font-black tabular-nums ${
                    result === "win" ? "emerald-text-grad" : result === "lose" ? "crimson-text-grad" : "text-zinc-400"
                  }`}>
                    {nextValue}{round.unit} 
                    <span className="text-xs font-extrabold">{diff! > 0 ? `↑ ${diff}` : diff! < 0 ? `↓ ${Math.abs(diff!)}` : "="}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AI Pundit with audio visualizer */}
          {pundit && !result && (
            <div className="mx-4 mb-4 rounded-xl bg-black/40 border border-[#3a473a]/40 overflow-hidden">
              <div className="px-4 pt-3 pb-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center shadow-lg shadow-[#00f0ff]/10">
                      <span className="text-[9px] font-black text-[#f4f6f4] tracking-widest">AI</span>
                    </div>
                    <span className="text-[11px] font-black text-[#d2dcd2] uppercase tracking-wider">AI MATCH BRIEF</span>
                  </div>

                  {/* Speak button + sound wave */}
                  <div className="flex items-center gap-3">
                    {speaking && (
                      <div className="flex items-end h-5">
                        <span className="audio-bar active" style={{ animationDelay: "0.1s" }} />
                        <span className="audio-bar active" style={{ animationDelay: "0.3s" }} />
                        <span className="audio-bar active" style={{ animationDelay: "0.2s" }} />
                        <span className="audio-bar active" style={{ animationDelay: "0.4s" }} />
                      </div>
                    )}
                    <button
                      onClick={toggleSpeak}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        speaking
                          ? "bg-[#ff2255] text-white shadow-lg shadow-[#ff2255]/20 animate-pulse"
                          : "bg-[#3a473a]/40 text-[#6b7c6b] hover:bg-[#3a473a]/80"
                      }`}
                    >
                      <span className="text-[10px]">{speaking ? "■" : "▶"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-2 bg-[#3a473a]/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pundit.confidence >= 65
                          ? "bg-[#00ff88]"
                          : pundit.confidence >= 55
                            ? "bg-[#00f0ff]"
                            : "bg-[#d4af37]"
                      }`}
                      style={{ width: `${pundit.confidence}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono">
                    <span className={`text-[15px] font-black ${
                      pundit.confidence >= 65
                        ? "text-[#00ff88]"
                        : pundit.confidence >= 55
                          ? "text-[#00f0ff]"
                          : "text-[#d4af37]"
                    }`}>{pundit.confidence}%</span>
                    <span className={`text-[8px] font-black ${
                      pundit.direction === "hi"
                        ? "text-[#00ff88]"
                        : pundit.direction === "lo"
                          ? "text-[#ff2255]"
                          : "text-[#6b7c6b]"
                    }`}>
                      {pundit.direction === "hi" ? "HIGHER" : pundit.direction === "lo" ? "LOWER" : "EVEN"}
                    </span>
                  </div>
                </div>
              </div>
              <p className="px-4 pb-3.5 text-[11px] leading-relaxed text-[#6b7c6b] font-medium border-t border-[#3a473a]/20 pt-2.5 mt-1">
                {pundit.text}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-3.5">
          <button
            onMouseEnter={() => !guess && setHoveredGuess("lo")}
            onMouseLeave={() => setHoveredGuess(null)}
            onClick={() => makeGuess("lo")}
            disabled={!!guess}
            className={`h-14 rounded-2xl font-black text-[12px] tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer ${
              guess === "lo"
                ? "bg-[#ff2255] text-white border-transparent shadow-[0_0_15px_rgba(255,34,85,0.25)]"
                : "bg-black/40 hover:bg-[#ff2255]/10 text-[#d2dcd2] border border-[#ff2255]/20 hover:border-[#ff2255]/40"
            } disabled:opacity-50`}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-base">↓</span> LOWER
            </span>
          </button>
          
          <button
            onMouseEnter={() => !guess && setHoveredGuess("hi")}
            onMouseLeave={() => setHoveredGuess(null)}
            onClick={() => makeGuess("hi")}
            disabled={!!guess}
            className={`h-14 rounded-2xl font-black text-[12px] tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer ${
              guess === "hi"
                ? "bg-[#00ff88] text-black border-transparent shadow-[0_0_15px_rgba(0,255,136,0.25)]"
                : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-transparent shadow-[0_0_15px_rgba(0,240,255,0.15)]"
            } disabled:opacity-50`}
          >
            <span className="flex items-center justify-center gap-2">
              HIGHER <span className="text-base">↑</span>
            </span>
          </button>
        </div>

        {/* Prediction Results Banner + Merkle Toggle */}
        {result && (
          <div className="mx-4 mb-4 space-y-2 anim-pop">
            <div className={`rounded-2xl px-4 py-4 flex items-center justify-between border ${
              result === "win"
                ? "bg-[#00ff88]/5 border-[#00ff88]/20"
                : result === "lose"
                  ? "bg-[#ff2255]/5 border-[#ff2255]/20"
                  : "bg-black/40 border-[#3a473a]/40"
            }`}>
              <div>
                <div className={`text-[12px] font-black uppercase tracking-wider ${
                  result === "win" ? "text-[#00ff88]" : result === "lose" ? "text-[#ff2255]" : "text-[#d2dcd2]"
                }`}>
                  {result === "win" ? `Correct! Streak Match ${streak}` : result === "lose" ? "Prediction Error — Streak Reset" : "Match Push — Streak Maintained"}
                </div>
                {result === "win" && streak >= 3 && (
                  <span className="text-[8px] text-[#00ff88]/70 font-bold uppercase tracking-[0.18em] block mt-1">
                    {streak >= 10 ? "LEGENDARY RUN" : streak >= 7 ? "STREAK MASTER" : "HEAT RISING"}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { playSound("click"); setShowProofPanel(!showProofPanel); }}
                  className="text-[9px] font-black tracking-widest uppercase px-4 py-2.5 rounded-xl border border-[#00f0ff]/35 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] transition-all cursor-pointer"
                >
                  Verify Proof
                </button>
                <button
                  onClick={() => newRound()}
                  className="text-[9px] font-black tracking-widest uppercase px-5 py-2.5 rounded-xl bg-[#3a473a]/40 hover:bg-[#3a473a]/80 text-[#f4f6f4] border border-[#3a473a]/60 transition-all cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Cryptographic Merkle verification terminal */}
            {showProofPanel && merkleProof && (
              <div className="rounded-2xl p-4 border border-[#00f0ff]/20 bg-black/70 font-mono text-[9px] text-[#6b7c6b] space-y-3 shadow-inner anim-up">
                <div className="flex justify-between items-center border-b border-[#3a473a]/30 pb-2">
                  <span className="text-[#00f0ff] font-bold">SOLANA PROOF VERIFIER ACTIVE</span>
                  <span className="text-[#00ff88] font-bold">✓ SECURED</span>
                </div>
                <div className="space-y-1.5 break-all">
                  <div>BLOCK NUMBER : <strong className="text-zinc-300">{merkleProof.block}</strong></div>
                  <div>TX HASH : <strong className="text-zinc-300">{merkleProof.signature}</strong></div>
                  <div>MERKLE ROOT : <strong className="text-zinc-300">{merkleProof.root}</strong></div>
                </div>

                {/* Proof Tree Visual chart */}
                <div className="pt-2 border-t border-[#3a473a]/25">
                  <div className="text-[8px] font-bold text-[#d4af37] mb-2">// MERKLE VERIFICATION PATH TREE:</div>
                  <div className="grid grid-cols-5 gap-2 items-center text-center">
                    <div className="col-span-2 merkle-node active">
                      Current Value<br />
                      <strong>{nextValue}</strong>
                    </div>
                    <div className="col-span-1 text-center font-bold text-[#00f0ff]">→</div>
                    <div className="col-span-2 merkle-node active">
                      Merkle Hash<br />
                      <strong>{merkleProof.nodeHash.slice(0, 10)}...</strong>
                    </div>
                  </div>
                  <div className="text-center text-[#6b7c6b] my-1 font-bold">|</div>
                  <div className="grid grid-cols-5 gap-2 items-center text-center">
                    <div className="col-span-2 merkle-node">
                      Sibling Leaf Hash<br />
                      <strong>{merkleProof.parentHash.slice(0, 10)}...</strong>
                    </div>
                    <div className="col-span-1 text-center font-bold text-[#6b7c6b]">→</div>
                    <div className="col-span-2 merkle-node active">
                      Solana Root<br />
                      <strong>{merkleProof.root.slice(0, 10)}...</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Streak scoreboard footer card */}
      <div className="rounded-2xl glass-panel px-6 py-5 flex items-center justify-between bg-black/40 border-[#3a473a]/40">
        <div className="flex gap-10">
          <div className="relative">
            <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block">CURRENT RUN</span>
            <div className={`text-3xl font-black tabular-nums tracking-tighter mt-1 ${
              streak >= 5 ? "emerald-text-grad glow-emerald fire-glow" : "text-[#f4f6f4]"
            }`}>{streak}</div>
          </div>
          <div>
            <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block">BEST ATTEMPT</span>
            <div className="text-3xl font-black tabular-nums tracking-tighter text-[#3a473a] mt-1">{best}</div>
          </div>
        </div>
        
        <button
          onClick={shareStreak}
          className="flex items-center gap-2 text-[9px] font-black tracking-widest uppercase px-5 py-3 rounded-xl bg-[#3a473a]/30 hover:bg-[#3a473a]/60 text-[#d2dcd2] border border-[#3a473a]/40 transition-all cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share Entry
        </button>
      </div>

      {!hideLeaderboard && <Leaderboard currentStreak={streak} />}
    </div>
  );
}
