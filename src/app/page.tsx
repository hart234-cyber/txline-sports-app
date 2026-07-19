"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// ── Particle component ──────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    left: Math.random() * 100,
    top: 20 + Math.random() * 70,
    dur: 5 + Math.random() * 8,
    delay: Math.random() * 6,
    drift: (Math.random() - 0.5) * 60,
    color: i % 5 === 0 ? "#e8c84a" : i % 5 === 1 ? "#00d4ff" : i % 5 === 2 ? "#00e87a" : i % 5 === 3 ? "#9b6dff" : "#ffffff",
    opacity: 0.15 + Math.random() * 0.35,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            width: p.size, height: p.size,
            left: `${p.left}%`, top: `${p.top}%`,
            background: p.color,
            opacity: p.opacity,
            "--dur": `${p.dur}s`,
            "--delay": `${p.delay}s`,
            "--drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Animated preview card ───────────────────────────────────────────────────
function HeroPreviewCard() {
  const [score, setScore] = useState({ home: 2, away: 1 });
  const [stat, setStat] = useState({ label: "Corners", value: 7 });
  const [streak, setStreak] = useState(12);
  const [result, setResult] = useState<"win" | null>(null);
  const [confidence, setConfidence] = useState(74);
  const [dir, setDir] = useState<"hi" | "lo">("hi");
  const [minute, setMinute] = useState(67);

  useEffect(() => {
    const iv = setInterval(() => {
      setMinute(m => Math.min(90, m + 1));
      setStat(prev => {
        const next = { label: prev.label === "Corners" ? "Shots" : "Corners", value: prev.label === "Corners" ? 11 : 7 };
        return next;
      });
      setConfidence(c => c === 74 ? 61 : 74);
      setDir(d => d === "hi" ? "lo" : "hi");
      setResult(prev => {
        if (!prev) {
          setStreak(s => s + 1);
          return "win";
        }
        return null;
      });
    }, 3800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative card-shimmer rounded-[28px] overflow-hidden"
         style={{ background: "linear-gradient(145deg, #0f1825 0%, #0b1018 100%)", border: "1px solid rgba(232,200,74,0.12)", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)" }}>

      {/* Top glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e8c84a]/40 to-transparent" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-[9px] font-black tracking-[0.25em] text-[#ff3355] uppercase">Live {minute}&apos;</span>
          </div>
          <span className="text-[8px] font-bold tracking-[0.2em] text-[#e8c84a]/70 uppercase bg-[#e8c84a]/8 border border-[#e8c84a]/15 px-2.5 py-1 rounded-full">
            World Cup · QF
          </span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <img src="https://flagcdn.com/w40/fr.png" alt="France" className="w-full h-full object-cover scale-110" />
            </div>
            <div>
              <div className="text-[9px] font-black text-[#8899bb] tracking-widest">FRA</div>
              <div className="text-[13px] font-black text-white mt-0.5">France</div>
            </div>
          </div>

          {/* Score */}
          <div className="text-center px-4">
            <div className="text-[38px] font-black text-white tabular-nums leading-none tracking-tight"
                 style={{ fontVariantNumeric: "tabular-nums" }}>
              <span>{score.home}</span>
              <span className="text-[#e8c84a] mx-2 text-[28px]">:</span>
              <span>{score.away}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[9px] font-black text-[#8899bb] tracking-widest">ESP</div>
              <div className="text-[13px] font-black text-white mt-0.5">Spain</div>
            </div>
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <img src="https://flagcdn.com/w40/es.png" alt="Spain" className="w-full h-full object-cover scale-110" />
            </div>
          </div>
        </div>
      </div>

      {/* Stat prediction area */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[8px] font-bold tracking-[0.2em] text-[#8899bb] uppercase">Active Stat</div>
            <div className="text-[16px] font-black text-white mt-0.5 uppercase tracking-wide">{stat.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] font-bold tracking-[0.2em] text-[#8899bb] uppercase">AI Confidence</div>
            <div className={`text-[15px] font-black mt-0.5 ${dir === "hi" ? "text-[#00e87a]" : "text-[#ff3355]"}`}>
              {confidence}% {dir === "hi" ? "HIGHER ↑" : "LOWER ↓"}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-3 mb-4">
          <div className="text-[52px] font-black text-white leading-none tabular-nums">{stat.value}</div>
          <div className="text-[11px] text-[#8899bb] mb-2">current total</div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="h-11 rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest uppercase cursor-pointer transition-all"
               style={{ background: "rgba(255,51,85,0.08)", border: "1px solid rgba(255,51,85,0.2)", color: "#ff3355" }}>
            ↓ Lower
          </div>
          <div className={`h-11 rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest uppercase cursor-pointer transition-all ${
            result ? "shadow-[0_0_20px_rgba(0,232,122,0.3)]" : ""
          }`}
               style={{
                 background: result ? "#00e87a" : "linear-gradient(135deg,#e8c84a,#c8a030)",
                 color: "#000",
               }}>
            Higher ↑
          </div>
        </div>

        {result && (
          <div className="mt-3 rounded-xl px-4 py-2.5 flex items-center justify-between anim-pop"
               style={{ background: "rgba(0,232,122,0.06)", border: "1px solid rgba(0,232,122,0.2)" }}>
            <span className="text-[10px] font-black text-[#00e87a] uppercase tracking-wider">✓ Correct! Streak +1</span>
            <span className="text-[8px] text-[#8899bb]">Next round loading…</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 pt-1 flex items-center justify-between border-t border-white/[0.04]">
        <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
          <span className="text-[#8899bb]">Streak <span className="text-[#00e87a] text-[13px]">{streak}</span></span>
          <span className="text-[#8899bb]">Best <span className="text-white text-[13px]">15</span></span>
        </div>
        <span className="text-[8px] font-black text-[#e8c84a] uppercase tracking-widest">🔥 On Fire</span>
      </div>
    </div>
  );
}

// ── Social proof ticker ─────────────────────────────────────────────────────
const TICKER_ITEMS = [
  "🔥 kaito.sol hit a 14-streak",
  "⚽ GOAL! France 3–1 Spain · 74'",
  "📈 TxLINE odds shifted HIGHER on corners",
  "🏆 lara_arg climbed to #2 on leaderboard",
  "⚡ marcus_usa streak: 9 and counting",
  "🎯 AI Pundit: 78% confidence LOWER on fouls",
  "🔗 On-chain proof verified · Solana Devnet",
  "🌍 104 World Cup matches · All live",
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden py-3 border-y border-white/[0.05]" style={{ background: "rgba(232,200,74,0.03)" }}>
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-[10px] font-bold text-[#8899bb] uppercase tracking-widest mx-8">
            {item}
            <span className="text-[#e8c84a]/30 mx-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main landing page ───────────────────────────────────────────────────────
export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      color: "#e8c84a",
      label: "Real-Time SSE",
      desc: "Live score events streamed directly from TxLINE's high-performance data layer. Sub-second latency across all 104 World Cup games.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      color: "#00d4ff",
      label: "Solana On-Chain",
      desc: "Every prediction is anchored on Solana via Merkle proofs. Tamper-evident, independently verifiable, zero gas fees on Devnet.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      color: "#9b6dff",
      label: "AI Pundit + TTS",
      desc: "Voice-powered AI pundit analyses live odds, possession, and momentum. Broadcasts goal alerts to Telegram with TTS commentary.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
      ),
      color: "#00e87a",
      label: "Hi-Lo Streak Game",
      desc: "Guess Higher or Lower on live stats — corners, shots, fouls, possession. Build streaks across all 104 matches. Compete globally.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      color: "#ff3355",
      label: "SOL Leagues",
      desc: "Pool 0.05 SOL with friends, compete on prediction streaks, claim the treasury. Real Solana transactions, real stakes.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      color: "#e8c84a",
      label: "Broadcast Dashboard",
      desc: "Sport-broadcast UI with live formation pitch, real-time stats bar, live chat, and a full fixture rail for all competitions.",
    },
  ];

  const steps = [
    { n: "01", title: "Connect Wallet", desc: "Sign in with your Solana wallet. No email, no password — just your key." },
    { n: "02", title: "Pick a Match", desc: "Choose any live or upcoming fixture from the TxLINE feed — WC, MLS, Serie A." },
    { n: "03", title: "Higher or Lower", desc: "Predict if the next stat (corners, shots, fouls) goes up or down. Lock in your call." },
    { n: "04", title: "Build Your Streak", desc: "Chain correct predictions. Every win is anchored on Solana. Climb the global board." },
  ];

  return (
    <main className="min-h-screen relative overflow-x-hidden" style={{ background: "#04060a" }}>
      {/* Backgrounds */}
      <div className="stadium-atmosphere" />
      <div className="pitch-grid" />
      <div className="scan-ray" />

      {/* Particles */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles />
      </div>

      <div className="relative z-10">
        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 border-b border-white/[0.05]"
             style={{ background: "rgba(4,6,10,0.85)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: "linear-gradient(135deg,#e8c84a,#a8882a)", boxShadow: "0 0 20px rgba(232,200,74,0.3)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              </div>
              <div>
                <div className="text-[14px] font-black tracking-[0.1em] text-white leading-none">STREAKLINE</div>
                <div className="text-[8px] font-bold tracking-[0.3em] text-[#e8c84a]/60 uppercase leading-none mt-0.5">World Cup 2026</div>
              </div>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { href: "/dashboard", label: "Dashboard" },
                
              ].map(l => (
                <Link key={l.href} href={l.href}
                      className="text-[10px] font-black tracking-[0.15em] text-[#8899bb] hover:text-[#e8c84a] uppercase transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <Link href="/dashboard"
                    className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all btn-gold">
                Launch App
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
              {mounted && <WalletMultiButton />}
            </div>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <section ref={heroRef} className="relative min-h-[calc(100vh-64px)] flex items-center">
          {/* Stadium floodlight beams */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-[15%] w-px h-[60%] opacity-[0.06]"
                 style={{ background: "linear-gradient(180deg,#e8c84a,transparent)" }} />
            <div className="absolute top-0 left-[85%] w-px h-[60%] opacity-[0.06]"
                 style={{ background: "linear-gradient(180deg,#e8c84a,transparent)" }} />
            <div className="absolute top-0 left-[50%] w-px h-[80%] opacity-[0.04]"
                 style={{ background: "linear-gradient(180deg,#00d4ff,transparent)" }} />
          </div>

          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 w-full py-20">
            <div className="grid lg:grid-cols-12 gap-16 items-center">

              {/* Left — headline */}
              <div className="lg:col-span-6 xl:col-span-7 anim-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-8"
                     style={{ background: "rgba(232,200,74,0.06)", border: "1px solid rgba(232,200,74,0.15)" }}>
                  <span className="live-dot" />
                  <span className="text-[9px] font-black tracking-[0.25em] text-[#e8c84a] uppercase">TxLINE × Solana · Live Now</span>
                </div>

                {/* Headline */}
                <h1 className="text-[64px] sm:text-[80px] lg:text-[96px] xl:text-[108px] font-black leading-[0.88] tracking-[-0.04em] uppercase mb-8">
                  <span className="text-white block">Predict.</span>
                  <span className="text-white block">Streak.</span>
                  <span className="gold-text-grad block" style={{ filter: "drop-shadow(0 0 40px rgba(232,200,74,0.25))" }}>
                    Triumph.
                  </span>
                </h1>

                <p className="text-[15px] leading-[1.7] text-[#8899bb] max-w-[500px] mb-10">
                  The ultimate prediction game for the <strong className="text-white">FIFA World Cup 2026</strong>.
                  Guess Higher or Lower on live stats powered by{" "}
                  <strong className="text-[#e8c84a]">TxLINE real-time feeds</strong>, build streaks across 104 games,
                  and anchor every prediction on{" "}
                  <strong className="text-[#9b6dff]">Solana</strong>.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-4 mb-12">
                  <Link href="/dashboard"
                        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-[12px] font-black tracking-widest uppercase btn-gold">
                    Enter the Pitch
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </Link>
                  {/* TxLINE key auto-configured */}
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-8">
                  {[
                    { value: "104", label: "WC Matches" },
                    { value: "Live", label: "TxLINE Feed" },
                    { value: "SOL", label: "On-Chain Proof" },
                    { value: "Free", label: "To Play" },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="text-[28px] font-black text-white leading-none gold-text-grad">{s.value}</div>
                      <div className="text-[9px] font-bold tracking-[0.2em] text-[#8899bb] uppercase mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — preview card */}
              <div className="lg:col-span-6 xl:col-span-5 anim-right anim-d2">
                <div className="relative">
                  {/* Glow behind card */}
                  <div className="absolute inset-[-20px] rounded-[48px] pointer-events-none"
                       style={{ background: "radial-gradient(ellipse at center, rgba(232,200,74,0.08) 0%, transparent 70%)" }} />
                  <HeroPreviewCard />
                  {/* Floating badge */}
                  <div className="absolute -top-4 -right-4 px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase anim-pop anim-d3"
                       style={{ background: "linear-gradient(135deg,#9b6dff,#6633cc)", boxShadow: "0 8px 24px rgba(155,109,255,0.3)" }}>
                    ⛓ Solana Verified
                  </div>
                  <div className="absolute -bottom-4 -left-4 px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase anim-pop anim-d4"
                       style={{ background: "linear-gradient(135deg,#00d4ff,#0088bb)", boxShadow: "0 8px 24px rgba(0,212,255,0.25)" }}>
                    📡 TxLINE Live
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TICKER ──────────────────────────────────────────────────── */}
        <Ticker />

        {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
        <section className="py-28 relative">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
                   style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}>
                <span className="text-[9px] font-black tracking-[0.25em] text-[#00d4ff] uppercase">Protocol Loop</span>
              </div>
              <h2 className="text-[40px] sm:text-[52px] font-black tracking-[-0.03em] text-white uppercase">
                How StreakLine Works
              </h2>
              <p className="text-[14px] text-[#8899bb] mt-4 max-w-[480px] mx-auto leading-relaxed">
                Four steps from wallet connect to on-chain glory.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {steps.map((s, i) => (
                <div key={s.n} className={`feature-card glass rounded-2xl p-7 anim-up anim-d${i + 1}`}>
                  <div className="text-[11px] font-black tracking-[0.3em] text-[#e8c84a] mb-4">{s.n}</div>
                  <h3 className="text-[16px] font-black text-white uppercase tracking-wide mb-3">{s.title}</h3>
                  <p className="text-[12px] text-[#8899bb] leading-relaxed">{s.desc}</p>
                  {/* Step connector */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-[#e8c84a]/30 to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ───────────────────────────────────────────── */}
        <section className="py-24 relative border-t border-white/[0.04]">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
                   style={{ background: "rgba(155,109,255,0.06)", border: "1px solid rgba(155,109,255,0.12)" }}>
                <span className="text-[9px] font-black tracking-[0.25em] text-[#9b6dff] uppercase">Full Feature Stack</span>
              </div>
              <h2 className="text-[40px] sm:text-[52px] font-black tracking-[-0.03em] text-white uppercase">
                Built for Fans.<br />
                <span className="gold-text-grad">Powered by Data.</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <div key={f.label}
                     className={`feature-card glass rounded-2xl p-7 anim-up anim-d${(i % 3) + 1}`}
                     style={{ borderColor: `${f.color}18` }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                       style={{ background: `${f.color}12`, color: f.color, border: `1px solid ${f.color}20` }}>
                    {f.icon}
                  </div>
                  <h3 className="text-[15px] font-black text-white uppercase tracking-wide mb-3">{f.label}</h3>
                  <p className="text-[12px] text-[#8899bb] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TECH STACK ──────────────────────────────────────────────── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="grid md:grid-cols-2 gap-6">
              {/* TxLINE */}
              <div className="glass-gold rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                     style={{ background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                       style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)" }}>
                    <span className="text-[8px] font-black tracking-[0.25em] text-[#00d4ff] uppercase">Real-Time Layer</span>
                  </div>
                  <h3 className="text-[28px] font-black text-white uppercase tracking-wide mb-4">TxLINE Infrastructure</h3>
                  <p className="text-[13px] text-[#8899bb] leading-relaxed mb-6">
                    StreakLine consumes TxLINE&apos;s high-performance REST snapshots and real-time Server-Sent Events (SSE)
                    for live scores, odds, and match events across all 104 World Cup games.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["REST Snapshots", "SSE Streams", "Live Odds", "Match Events", "104 Games"].map(t => (
                      <span key={t} className="text-[9px] font-bold tracking-wider text-[#00d4ff] uppercase px-3 py-1.5 rounded-lg"
                            style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Solana */}
              <div className="glass-gold rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                     style={{ background: "radial-gradient(circle, rgba(155,109,255,0.06) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                       style={{ background: "rgba(155,109,255,0.08)", border: "1px solid rgba(155,109,255,0.15)" }}>
                    <span className="text-[8px] font-black tracking-[0.25em] text-[#9b6dff] uppercase">Blockchain Layer</span>
                  </div>
                  <h3 className="text-[28px] font-black text-white uppercase tracking-wide mb-4">Anchored on Solana</h3>
                  <p className="text-[13px] text-[#8899bb] leading-relaxed mb-6">
                    Active players subscribe on-chain through the TxLINE Devnet Program. Predictions are anchored via
                    Merkle proofs — tamper-evident, independently verifiable, zero gas fees.
                  </p>
                  <div className="flex gap-4">
                    <Link href="/dashboard"
                          className="text-[11px] font-black tracking-widest text-[#e8c84a] hover:text-white uppercase transition-colors">
                      Launch Dashboard →
                    </Link>
                    {/* Setup guide removed */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ────────────────────────────────────────────── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="text-center mb-16">
              <h2 className="text-[36px] sm:text-[48px] font-black tracking-[-0.03em] text-white uppercase">
                Fans Are Already Playing
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { user: "kaito.sol", streak: 14, msg: "StreakLine is insane. The AI pundit called 9 corners in a row correctly. On-chain proof is the real deal.", flag: "🇯🇵" },
                { user: "lara_arg", streak: 11, msg: "Joined the World Cup Elite Pool with 0.05 SOL. Already up 3x. The TxLINE feed is lightning fast.", flag: "🇦🇷" },
                { user: "moyo_ng", streak: 8, msg: "The GOAL shout overlay is 🔥🔥🔥. Heard the stadium horn at 2am and woke up my whole house lmao.", flag: "🇳🇬" },
              ].map(t => (
                <div key={t.user} className="glass rounded-2xl p-6 feature-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[18px]"
                         style={{ background: "rgba(232,200,74,0.08)", border: "1px solid rgba(232,200,74,0.15)" }}>
                      {t.flag}
                    </div>
                    <div>
                      <div className="text-[12px] font-black text-white">{t.user}</div>
                      <div className="text-[9px] text-[#00e87a] font-bold">🔥 Streak: {t.streak}</div>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#8899bb] leading-relaxed">&ldquo;{t.msg}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <section className="py-32 border-t border-white/[0.04] relative overflow-hidden">
          {/* Big glow */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(232,200,74,0.05) 0%, transparent 70%)" }} />
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 text-center relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
                 style={{ background: "rgba(232,200,74,0.06)", border: "1px solid rgba(232,200,74,0.15)" }}>
              <span className="text-[9px] font-black tracking-[0.25em] text-[#e8c84a] uppercase">⚽ World Cup 2026 · Live Now</span>
            </div>
            <h2 className="text-[48px] sm:text-[64px] lg:text-[80px] font-black tracking-[-0.04em] text-white uppercase mb-6">
              Ready to<br />
              <span className="gold-text-grad">Dominate?</span>
            </h2>
            <p className="text-[15px] text-[#8899bb] max-w-[480px] mx-auto mb-12 leading-relaxed">
              104 matches. Real-time data. On-chain proof. The pitch is open — your streak starts now.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/dashboard"
                    className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-[13px] font-black tracking-widest uppercase btn-gold">
                Enter Prediction Deck
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
              {/* TxLINE auto-activated */}
            </div>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <footer className="border-t border-white/[0.05] py-10">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg,#e8c84a,#a8882a)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              </div>
              <span className="text-[11px] font-black tracking-[0.1em] text-white">STREAKLINE</span>
            </div>
            <div className="flex flex-wrap gap-6 text-[9px] font-bold tracking-widest text-[#3d4f6a] uppercase">
              <Link href="/dashboard" className="hover:text-[#e8c84a] transition-colors">Dashboard</Link>
              
              <span>TxLINE × Superteam Earn</span>
              <span>Solana Devnet · No Real Wagering</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
