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
  useEffect(() => setMounted(true), []);

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(160deg, #100c08 0%, #0e0a06 40%, #12100c 100%)" }}>

      {/* Geometric decorations - like image 1 */}
      <div className="absolute top-[15%] left-[5%] w-[120px] h-[120px] border border-[#2a2420]/40 rotate-45 pointer-events-none" />
      <div className="absolute top-[25%] left-[8%] w-[80px] h-[80px] border border-[#2a2420]/25 rotate-45 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[3%] w-[60px] h-[60px] border border-[#2a2420]/20 rotate-45 pointer-events-none" />
      <div className="absolute top-[10%] right-[15%] w-[40px] h-[40px] border border-[#2a2420]/15 rotate-45 pointer-events-none" />

      {/* Subtle warm glow */}
      <div className="absolute top-[-100px] right-[10%] w-[600px] h-[600px] rounded-full bg-[#c4a44e]/[0.03] blur-[120px] pointer-events-none" />

      <div className="relative max-w-[1100px] mx-auto px-6 sm:px-10">

        {/* NAV */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-[#c4a44e]/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a44e" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <span className="text-[14px] font-bold tracking-wide text-[#d4c9b0]">STREAKLINE</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-[11px] font-medium tracking-wider text-[#6b6155] hover:text-[#d4c9b0] transition-colors uppercase">Dashboard</Link>
            <Link href="/activate" className="text-[11px] font-medium tracking-wider text-[#6b6155] hover:text-[#d4c9b0] transition-colors uppercase">Setup</Link>
            {mounted && <WalletMultiButton />}
          </div>
        </nav>

        {/* HERO */}
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-180px)] py-16 lg:py-0">

          {/* Left */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.3em] text-[#c4a44e]/60 uppercase mb-6">
              TxLINE World Cup 2026 — Powered by Solana
            </div>

            <h1 className="text-[52px] sm:text-[64px] lg:text-[76px] font-black tracking-[-0.03em] leading-[0.88] text-[#f0ebe0] uppercase">
              Predict.<br/>
              Streak.<br/>
              <span className="text-[#c4a44e]">Win.</span>
            </h1>

            <p className="text-[14px] leading-relaxed text-[#7a7060] mt-7 max-w-[420px]">
              The Hi-Lo World Cup stats game. Real-time blockchain-verified data from TxLINE.
              Corners, shots, possession — will the next update go higher or lower?
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#c4a44e] hover:bg-[#d4b45e] text-[#0e0a06] font-bold text-[12px] tracking-wider uppercase transition-all active:scale-[0.97]">
                Play Now
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <Link href="/activate"
                className="inline-flex items-center px-6 py-3.5 rounded-lg border border-[#3a3228] hover:border-[#5a4e3e] text-[#8a7e6e] hover:text-[#d4c9b0] font-semibold text-[12px] tracking-wider uppercase transition-all">
                Activate TxLINE
              </Link>
            </div>

            {/* Feature tags — no emoji */}
            <div className="flex flex-wrap gap-3 mt-10">
              {["Real-Time Data", "AI Pundit", "On-Chain Verified", "Global Leaderboard"].map(f => (
                <span key={f} className="text-[9px] font-semibold tracking-[0.15em] text-[#5a5040] uppercase border border-[#2a2420]/60 px-3 py-1.5 rounded-md">{f}</span>
              ))}
            </div>
          </div>

          {/* Right — preview card */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-[#c4a44e]/[0.03] blur-[50px] scale-90" />
              <div className="relative rounded-2xl border border-[#2a2420]/50 overflow-hidden" style={{ background: "linear-gradient(145deg, #1a1610 0%, #14120e 100%)" }}>

                {/* Match preview header */}
                <div className="relative px-6 pt-6 pb-5" style={{ background: "linear-gradient(135deg, rgba(55,114,255,0.08), rgba(196,164,78,0.04))" }}>
                  <div className="text-[9px] font-semibold tracking-[0.2em] text-[#6b6155] uppercase mb-3">World Cup 2026 — Group F</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src="https://flagcdn.com/w40/fr.png" alt="" width={36} height={24} className="rounded-md shadow-lg object-cover"/>
                      <div>
                        <div className="text-[9px] font-semibold tracking-widest text-[#6b6155]">FRA</div>
                        <div className="text-[15px] font-bold text-[#f0ebe0]">France</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-extrabold text-[#f0ebe0] tabular-nums">2<span className="text-[#3a3228] mx-1.5">:</span>1</div>
                      <div className="text-[8px] font-bold tracking-widest text-[#2ecc71]">LIVE 67'</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[9px] font-semibold tracking-widest text-[#6b6155]">ESP</div>
                        <div className="text-[15px] font-bold text-[#f0ebe0]">Spain</div>
                      </div>
                      <img src="https://flagcdn.com/w40/es.png" alt="" width={36} height={24} className="rounded-md shadow-lg object-cover"/>
                    </div>
                  </div>
                </div>

                {/* Stat preview */}
                <div className="px-6 py-4 border-t border-[#2a2420]/40">
                  <div className="text-[8px] font-bold tracking-[0.2em] text-[#5a5040] uppercase">Next TxLINE Update</div>
                  <div className="text-[18px] font-extrabold text-[#f0ebe0] mt-1">Corners</div>
                  <div className="flex items-end gap-8 mt-3">
                    <div>
                      <div className="text-[8px] font-bold tracking-widest text-[#5a5040]">CURRENT</div>
                      <div className="text-[42px] font-black text-[#f0ebe0] leading-none">7</div>
                    </div>
                    <div className="pb-1">
                      <div className="text-[8px] font-bold tracking-widest text-[#5a5040]">AI CONFIDENCE</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-24 h-2 bg-[#1a1610] rounded-full overflow-hidden">
                          <div className="h-full w-[72%] bg-gradient-to-r from-[#2ecc71] to-[#27ae60] rounded-full"/>
                        </div>
                        <span className="text-[14px] font-black text-[#2ecc71] tabular-nums">72%</span>
                        <span className="text-[8px] font-bold tracking-widest text-[#2ecc71]">HIGHER</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mock buttons */}
                <div className="px-6 pb-4 grid grid-cols-2 gap-2">
                  <div className="h-10 rounded-lg border border-[#2a2420]/50 flex items-center justify-center text-[11px] font-bold text-[#6b6155] tracking-wider uppercase">Lower</div>
                  <div className="h-10 rounded-lg bg-[#c4a44e] flex items-center justify-center text-[11px] font-bold text-[#0e0a06] tracking-wider uppercase">Higher</div>
                </div>

                {/* Streak preview */}
                <div className="px-6 py-3 border-t border-[#2a2420]/40 flex items-center justify-between">
                  <div className="flex gap-6">
                    <div><div className="text-[7px] font-bold tracking-widest text-[#5a5040]">STREAK</div><div className="text-xl font-black text-[#c4a44e]">12</div></div>
                    <div><div className="text-[7px] font-bold tracking-widest text-[#5a5040]">BEST</div><div className="text-xl font-black text-[#5a5040]">12</div></div>
                  </div>
                  <span className="text-[9px] font-bold tracking-wider text-[#c4a44e]/60 uppercase">On fire</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="py-20 border-t border-[#2a2420]/30">
          <div className="text-center mb-14">
            <div className="text-[9px] font-semibold tracking-[0.3em] text-[#c4a44e]/50 uppercase mb-3">The Method</div>
            <h2 className="text-[32px] sm:text-[40px] font-black tracking-tight text-[#f0ebe0] uppercase">How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "01", title: "Pick a match", desc: "Choose any live or scheduled World Cup fixture from the schedule" },
              { n: "02", title: "Read the AI", desc: "Our AI pundit analyzes TxLINE odds and gives a confidence percentage" },
              { n: "03", title: "Higher or lower", desc: "Predict if the next stat update goes up or down. Swipe or tap" },
              { n: "04", title: "Build streak", desc: "Correct extends your streak. Wrong resets to zero. Top the global board" },
            ].map(s => (
              <div key={s.n} className="rounded-xl border border-[#2a2420]/40 p-5 hover:border-[#c4a44e]/15 transition-all" style={{ background: "rgba(18,16,12,0.6)" }}>
                <div className="text-[10px] font-bold tracking-[0.2em] text-[#c4a44e]/40 mb-3">{s.n}</div>
                <h3 className="text-[13px] font-bold text-[#e0d8c8] uppercase tracking-wide mb-2">{s.title}</h3>
                <p className="text-[11px] text-[#6b6155] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TECH */}
        <div className="py-16 border-t border-[#2a2420]/30">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <div className="text-[9px] font-semibold tracking-[0.3em] text-[#c4a44e]/40 uppercase mb-2">Infrastructure</div>
              <h3 className="text-[22px] font-black text-[#f0ebe0] uppercase tracking-wide mb-3">Powered by TxLINE</h3>
              <p className="text-[12px] text-[#6b6155] leading-relaxed mb-4">
                Every stat update is fetched from TxLINE's real-time sports data API and cryptographically anchored on the Solana blockchain. Fully verifiable. No manipulation.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Fixtures API", "Scores SSE", "Odds Snapshots", "Stat Validation", "Merkle Proofs"].map(f => (
                  <span key={f} className="text-[9px] font-semibold tracking-wider text-[#5a5040] uppercase border border-[#2a2420]/40 px-2.5 py-1 rounded-md">{f}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-semibold tracking-[0.3em] text-[#c4a44e]/40 uppercase mb-2">Network</div>
              <h3 className="text-[22px] font-black text-[#f0ebe0] uppercase tracking-wide mb-3">Built on Solana</h3>
              <p className="text-[12px] text-[#6b6155] leading-relaxed mb-4">
                Free World Cup tier on Solana devnet. No TxL payment required. Connect wallet, subscribe on-chain, start predicting in under a minute.
              </p>
              <div className="flex gap-4">
                <Link href="/dashboard" className="text-[11px] font-bold tracking-wider text-[#c4a44e] hover:text-[#d4b45e] uppercase transition-colors">Start playing</Link>
                <Link href="/activate" className="text-[11px] tracking-wider text-[#5a5040] hover:text-[#8a7e6e] uppercase transition-colors">Setup guide</Link>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="py-16 border-t border-[#2a2420]/30 text-center">
          <div className="text-[9px] font-semibold tracking-[0.3em] text-[#c4a44e]/40 uppercase mb-4">Start Your Career Now</div>
          <h2 className="text-[28px] sm:text-[38px] font-black text-[#f0ebe0] uppercase tracking-wide mb-6">Ready to Play?</h2>
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#c4a44e] hover:bg-[#d4b45e] text-[#0e0a06] font-bold text-[13px] tracking-wider uppercase transition-all active:scale-[0.97]">
            Launch Dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>

        {/* FOOTER */}
        <footer className="py-8 border-t border-[#2a2420]/20 text-[9px] tracking-wider text-[#3a3228] uppercase flex flex-wrap justify-between gap-4">
          <span>2026 StreakLINE — TxLINE x Superteam Earn</span>
          <span>Solana devnet — Fan prediction game — No real-money wagering</span>
        </footer>
      </div>
    </main>
  );
}
