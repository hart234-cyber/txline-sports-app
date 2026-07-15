"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  
  // Interactive mock game loop on the landing page preview card
  const [mockScore, setMockScore] = useState({ home: 2, away: 1 });
  const [mockStat, setMockStat] = useState({ label: "Corners", value: 7, next: null as number | null, active: false });
  const [mockStreak, setMockStreak] = useState(12);
  const [mockResult, setMockResult] = useState<"win" | "lose" | null>(null);
  const [mockAI, setMockAI] = useState({ confidence: 72, direction: "hi" });

  useEffect(() => {
    setMounted(true);
    
    // Simple cycle for the landing preview card to keep it interactive and alive
    const interval = setInterval(() => {
      setMockStat(prev => {
        if (prev.next !== null) {
          // Reset phase
          return { label: "Shots", value: 11, next: null, active: false };
        } else {
          // Trigger win
          return { ...prev, next: prev.value + 1, active: true };
        }
      });
      
      setMockAI(prev => {
        if (prev.confidence === 72) {
          return { confidence: 64, direction: "lo" };
        } else {
          return { confidence: 72, direction: "hi" };
        }
      });

      setMockResult(prev => {
        if (prev === null) {
          setMockStreak(s => s + 1);
          return "win";
        } else {
          return null;
        }
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden py-4">
      {/* Premium stadium lighting background and terminal grid overlay */}
      <div className="stadium-glow" />
      <div className="terminal-grid" />

      {/* Futuristic scanning ray */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff]/20 to-transparent" 
           style={{ animation: "sw 4s linear infinite" }} />

      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 z-10">
        {/* NAV */}
        <nav className="flex items-center justify-between py-6 border-b border-[#d4af37]/10 glass-panel rounded-2xl px-6 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-[#d4af37]/20 flex items-center justify-center bg-black/40 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" className="glow-gold">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div>
              <span className="text-[15px] font-black tracking-[0.12em] text-[#f4f6f4] block">STREAKLINE</span>
              <span className="text-[7px] font-black tracking-[0.3em] text-[#d4af37]/75 uppercase block leading-none">World Cup 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-[11px] font-bold tracking-widest text-[#6b7c6b] hover:text-[#d4af37] transition-all uppercase">Dashboard</Link>
            <Link href="/activate" className="text-[11px] font-bold tracking-widest text-[#6b7c6b] hover:text-[#d4af37] transition-all uppercase">Activation</Link>
            {mounted && <WalletMultiButton />}
          </div>
        </nav>

        {/* HERO SECTION */}
        <div className="grid lg:grid-cols-12 gap-16 items-center min-h-[calc(100vh-240px)] pb-12">
          {/* Left Column: Headline */}
          <div className="lg:col-span-7 flex flex-col justify-center anim-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border-[#d4af37]/10 w-fit mb-6">
              <span className="live-dot" />
              <span className="text-[9px] font-bold tracking-[0.25em] text-[#d4af37] uppercase">TxLINE Free Tier Enabled</span>
            </div>

            <h1 className="text-[58px] sm:text-[72px] lg:text-[84px] font-black tracking-[-0.04em] leading-[0.85] text-[#f4f6f4] uppercase">
              Predict.<br />
              Streak.<br />
              <span className="gold-text-grad">Triumph.</span>
            </h1>

            <p className="text-[14px] leading-relaxed text-[#6b7c6b] mt-8 max-w-[480px]">
              Step onto the ultimate high-performance prediction pitch. Guess **Higher** or **Lower** on live stats (corners, possession, fouls) powered by real-time blockchain-verified data feeds. Accumulate your streak across 104 games.
            </p>

            <div className="flex flex-wrap gap-4 mt-10">
              <Link href="/dashboard"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f4e8c1] hover:from-[#f4e8c1] hover:to-[#d4af37] text-black font-extrabold text-[12px] tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] active:scale-[0.97]">
                Launch Terminal
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
              <Link href="/activate"
                className="inline-flex items-center px-8 py-4 rounded-xl glass-panel border-[#3a473a] hover:border-[#6b7c6b] text-[#d2dcd2] hover:text-[#00f0ff] font-bold text-[12px] tracking-widest uppercase transition-all">
                Setup Solana Key
              </Link>
            </div>

            {/* Feature tags */}
            <div className="flex flex-wrap gap-3 mt-12">
              {["Real-time SSE Streams", "TTS AI Pundit", "Solana On-Chain proofs", "Dynamic Sparklines"].map(f => (
                <span key={f} className="text-[9px] font-bold tracking-[0.15em] text-[#6b7c6b] uppercase border border-[#3a473a]/50 px-3.5 py-2 rounded-lg bg-black/20">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Hologram Preview Card */}
          <div className="lg:col-span-5 hidden lg:block anim-up anim-d1">
            <div className="relative">
              <div className="absolute inset-0 rounded-[32px] bg-[#00ff88]/[0.02] blur-[80px] scale-90 pointer-events-none" />
              
              {/* Main Frosted Preview Card */}
              <div className="relative rounded-[28px] glass-panel p-6 border-[#d4af37]/15 bg-black/50 shadow-2xl overflow-hidden">
                {/* Simulated Glass scanlines overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,18,0.2)_1px,transparent_1px)] bg-[size:100%_4px] opacity-10 pointer-events-none" />

                {/* Match header */}
                <div className="relative rounded-2xl p-4 border border-[#3a473a]/40 bg-[#0f140f]/60 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[8px] font-bold tracking-[0.25em] text-[#6b7c6b] uppercase">World Cup — Group F</span>
                    <span className="text-[8px] font-bold tracking-[0.18em] text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded border border-[#00ff88]/15 anim-pulse">LIVE 67'</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src="https://flagcdn.com/w40/fr.png" alt="" width={32} className="rounded shadow-md object-cover" />
                      <div>
                        <div className="text-[9px] font-bold text-[#6b7c6b] tracking-wider leading-none">FRA</div>
                        <div className="text-[13px] font-extrabold text-[#f4f6f4] mt-1">France</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-[#f4f6f4] tabular-nums tracking-wide">
                        {mockScore.home}<span className="text-[#d4af37] mx-1.5">:</span>{mockScore.away}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-[#6b7c6b] tracking-wider leading-none">ESP</div>
                        <div className="text-[13px] font-extrabold text-[#f4f6f4] mt-1">Spain</div>
                      </div>
                      <img src="https://flagcdn.com/w40/es.png" alt="" width={32} className="rounded shadow-md object-cover" />
                    </div>
                  </div>
                </div>

                {/* Stat Display Box */}
                <div className={`rounded-2xl p-5 border transition-all duration-500 bg-[#0f140f]/30 ${
                  mockResult ? "border-[#00ff88]/20 bg-[#00ff88]/[0.02]" : "border-[#3a473a]/40"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase">Active Stat Target</span>
                      <h4 className="text-lg font-black text-[#f4f6f4] uppercase tracking-wide mt-0.5">{mockStat.label}</h4>
                    </div>
                    <span className="text-[9px] font-black tracking-widest text-[#00f0ff] bg-[#00f0ff]/10 px-2.5 py-1 rounded border border-[#00f0ff]/15">
                      TXLINE IDLE
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase">Current Total</span>
                      <div className="text-4xl font-black text-[#f4f6f4] tabular-nums mt-1 leading-none">{mockStat.value}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block mb-1">AI CONFIDENCE</span>
                      <div className="inline-flex items-center gap-2">
                        <span className={`text-[13px] font-black ${mockAI.direction === "hi" ? "emerald-text-grad" : "crimson-text-grad"}`}>
                          {mockAI.confidence}% {mockAI.direction === "hi" ? "HIGHER" : "LOWER"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons simulated */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="h-12 rounded-xl border border-[#ff2255]/20 bg-[#ff2255]/5 hover:bg-[#ff2255]/10 flex items-center justify-center text-[10px] font-black text-[#ff2255] tracking-widest uppercase transition-all cursor-pointer">
                    Lower
                  </div>
                  <div className={`h-12 rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer ${
                    mockResult ? "bg-[#00ff88] text-black shadow-[0_0_15px_rgba(0,255,136,0.3)]" : "bg-[#d4af37] text-black"
                  }`}>
                    Higher
                  </div>
                </div>

                {/* Simulated game feedback */}
                {mockResult && (
                  <div className="mt-4 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-3 flex items-center justify-between anim-pop">
                    <span className="text-[10px] font-extrabold text-[#00ff88] uppercase tracking-wider">Correct! Streak +1</span>
                    <span className="text-[8px] font-bold text-zinc-400">Next Round loading...</span>
                  </div>
                )}

                {/* Stats Footer bar */}
                <div className="mt-5 pt-4 border-t border-[#3a473a]/40 flex justify-between items-center text-[9px] font-bold tracking-widest text-[#6b7c6b] uppercase">
                  <span>STREAK: <strong className="text-[#00ff88] text-xs font-black">{mockStreak}</strong></span>
                  <span>BEST: <strong className="text-zinc-300 text-xs font-black">15</strong></span>
                  <span className="text-[#d4af37]">ON FIRE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* METHOD SECTION */}
        <div className="py-20 border-t border-[#3a473a]/30">
          <div className="text-center mb-16">
            <span className="text-[9px] font-bold tracking-[0.3em] text-[#d4af37] uppercase block mb-2">Protocol Loop</span>
            <h2 className="text-[32px] sm:text-[40px] font-black tracking-tight text-[#f4f6f4] uppercase">How StreakLINE Works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: "01", title: "Select Fixture", desc: "Select any active World Cup game from the live schedule rail." },
              { n: "02", title: "Review AI Pundit", desc: "Evaluate real-time odds analytics and TTS voice briefs from the pundit." },
              { n: "03", title: "Higher or Lower", desc: "Predict if the next stat change rises or falls. Tap or swipe to lock in." },
              { n: "04", title: "Multiply Streak", desc: "Keep a flawless streak to climb the global leaderboard. Reset on miss." },
            ].map(s => (
              <div key={s.n} className="glass-panel rounded-2xl p-6 hover:border-[#d4af37]/25 transition-all bg-black/20">
                <span className="text-[10px] font-black tracking-[0.25em] text-[#d4af37] block mb-3">{s.n}</span>
                <h3 className="text-[14px] font-black text-[#f4f6f4] uppercase tracking-wider mb-2">{s.title}</h3>
                <p className="text-[11px] text-[#6b7c6b] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* BLOCKCHAIN STACK */}
        <div className="py-16 border-t border-[#3a473a]/30">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="glass-panel p-8 rounded-2xl border-[#3a473a]/40 bg-black/30">
              <span className="text-[8px] font-bold tracking-[0.3em] text-[#00f0ff] uppercase block mb-2">Real-time Layer</span>
              <h3 className="text-2xl font-black text-[#f4f6f4] uppercase tracking-wider mb-4">TxLINE Infrastructure</h3>
              <p className="text-[12px] text-[#6b7c6b] leading-relaxed mb-6">
                StreakLINE consumes high-performance REST snapshots and real-time Server-Sent Events (SSE) direct from TxLINE feeds. All stats are verified on-chain via Solana Merkle proofs.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Snapshots", "SSE Streams", "Merkle Proofs", "Odds Tracker"].map(f => (
                  <span key={f} className="text-[8px] font-bold tracking-wider text-[#00f0ff] uppercase border border-[#00f0ff]/20 px-3 py-1.5 rounded-md bg-[#00f0ff]/5">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-panel p-8 rounded-2xl border-[#3a473a]/40 bg-black/30">
              <span className="text-[8px] font-bold tracking-[0.3em] text-[#d4af37] uppercase block mb-2">Blockchain Layer</span>
              <h3 className="text-2xl font-black text-[#f4f6f4] uppercase tracking-wider mb-4">Anchored on Solana</h3>
              <p className="text-[12px] text-[#6b7c6b] leading-relaxed mb-6">
                Active players subscribe on-chain through the official TxLINE Devnet Program. No expensive gas fees – wallet signatures ensure cryptographic security and verifiability.
              </p>
              <div className="flex gap-4">
                <Link href="/dashboard" className="text-[11px] font-bold tracking-widest text-[#d4af37] hover:text-white uppercase transition-all">Launch Dashboard</Link>
                <Link href="/activate" className="text-[11px] font-bold tracking-widest text-[#6b7c6b] hover:text-[#d4af37] uppercase transition-all">Setup Guide</Link>
              </div>
            </div>
          </div>
        </div>

        {/* CALL TO ACTION */}
        <div className="py-20 border-t border-[#3a473a]/30 text-center">
          <span className="text-[9px] font-bold tracking-[0.3em] text-[#d4af37] uppercase block mb-3">Compete on Global Stage</span>
          <h2 className="text-[32px] sm:text-[44px] font-black text-[#f4f6f4] uppercase tracking-wider mb-8">Ready to Predict?</h2>
          <Link href="/dashboard"
            className="inline-flex items-center gap-3.5 px-10 py-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f4e8c1] hover:from-[#f4e8c1] hover:to-[#d4af37] text-black font-extrabold text-[13px] tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(212,175,55,0.25)] active:scale-[0.97]">
            Enter Prediction Deck
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
        </div>

        {/* FOOTER */}
        <footer className="py-8 border-t border-[#3a473a]/25 text-[8px] tracking-widest text-[#6b7c6b] uppercase flex flex-wrap justify-between gap-4">
          <span>2026 STREAKLINE — TXLINE × SUPERTEAM EARN</span>
          <span>No real-money wagering · Solana Devnet</span>
        </footer>
      </div>
    </main>
  );
}
