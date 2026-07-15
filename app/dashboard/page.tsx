"use client";

import { useEffect, useState, useCallback } from "react";
import StreakGame from "@/components/StreakGame";
import MatchSchedule from "@/components/MatchSchedule";
import Leaderboard from "@/components/Leaderboard";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import Link from "next/link";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Dashboard() {
  const { publicKey } = useWallet();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"play" | "schedule" | "rewards">("play");
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const k = localStorage.getItem("txline_permanent_token");
    if (k) setApiKey(k);
    const poll = () => {
      setStreak(parseInt(localStorage.getItem("streakline_current") || "0"));
      setBest(parseInt(localStorage.getItem("streakline_best") || "0"));
    };
    poll();
    const iv = setInterval(poll, 1000);
    return () => clearInterval(iv);
  }, [publicKey]);

  const onSchedulePick = useCallback((fixtureId: number) => {
    setSelectedFixtureId(fixtureId);
    setTab("play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const sideNav = [
    { id: "play" as const, label: "Play", d: "M5 3l14 9-14 9V3z" },
    { id: "schedule" as const, label: "Matches", d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { id: "rewards" as const, label: "Rewards", d: "M12 15l-2 5h4l-2-5zm0 0l6-10H6l6 10z" },
  ];

  return (
    <main className="min-h-screen relative" style={{ background: "linear-gradient(160deg, #100c08 0%, #14120e 50%, #100c08 100%)" }}>
      <div className="relative flex min-h-screen">

        {/* ═══ LEFT SIDEBAR ═══ */}
        <aside className="hidden lg:flex flex-col w-[200px] min-h-screen border-r border-[#2a2420]/40 px-3 py-5 shrink-0 fixed left-0 top-0 bottom-0 z-30" style={{ background: "#0e0a06" }}>
          <Link href="/" className="flex items-center gap-2.5 mb-10 px-2 group">
            <div className="w-8 h-8 rounded-lg border border-[#c4a44e]/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4a44e" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div>
              <div className="text-[12px] font-bold text-[#d4c9b0] tracking-wider group-hover:text-[#c4a44e] transition-colors">STREAKLINE</div>
              <div className="text-[7px] font-semibold text-[#5a5040]/60 tracking-[0.2em]">WORLD CUP 2026</div>
            </div>
          </Link>

          <div className="space-y-1 flex-1">
            {sideNav.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[11px] font-semibold tracking-wider uppercase transition-all ${
                  tab === item.id
                    ? "bg-[#c4a44e]/10 text-[#c4a44e] border border-[#c4a44e]/12"
                    : "text-[#5a5040] hover:text-[#a09080] hover:bg-[#c4a44e]/4 border border-transparent"
                }`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.d}/></svg>
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[#2a2420]/30 space-y-3 px-2">
            <Link href="/activate" className="block text-[9px] font-semibold tracking-[0.15em] text-[#3a3228] hover:text-[#8a7e6e] uppercase transition-colors">TxLINE Setup</Link>
            <div className="flex items-center gap-1.5 text-[8px] text-[#2a2420]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2ecc71]" />
              <span className="tracking-wider">SOLANA DEVNET</span>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN AREA ═══ */}
        <div className="flex-1 lg:ml-[200px]">

          {/* Top bar */}
          <header className="sticky top-0 z-20 border-b border-[#2a2420]/30 px-5 lg:px-8 py-3 flex items-center justify-between" style={{ background: "rgba(16,12,8,0.92)", backdropFilter: "blur(16px)" }}>
            <div className="lg:hidden flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md border border-[#c4a44e]/15 flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c4a44e" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                </div>
                <span className="text-[11px] font-bold text-[#d4c9b0] tracking-wider">STREAKLINE</span>
              </Link>
            </div>
            <div className="lg:hidden flex gap-0.5 rounded-lg p-0.5 border border-[#2a2420]/40" style={{ background: "#0e0a06" }}>
              {(["play","schedule","rewards"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-[9px] font-bold tracking-wider uppercase transition-all ${
                    tab === t ? "bg-[#c4a44e]/10 text-[#c4a44e]" : "text-[#5a5040]"
                  }`}>{t}</button>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-2 text-[11px] tracking-wider">
              <span className="text-[#3a3228] uppercase">Dashboard</span>
              <span className="text-[#2a2420]">/</span>
              <span className="text-[#c4a44e] font-semibold uppercase">{tab}</span>
            </div>
            <div className="flex items-center gap-3">
              {!apiKey && <a href="/activate" className="hidden sm:block text-[9px] font-bold tracking-wider text-[#c4a44e]/60 hover:text-[#c4a44e] uppercase transition-colors">Activate</a>}
              <WalletMultiButton />
            </div>
          </header>

          {/* Content — wide with right sidebar */}
          <div className="px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex gap-6">

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {tab === "play" && (
                  <div className="anim-up">
                    {!apiKey && (
                      <div className="card rounded-xl px-5 py-4 mb-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[12px] font-bold text-[#f0ebe0] uppercase tracking-wide">Activate live data</div>
                            <p className="text-[10px] text-[#5a5040] mt-0.5">Free tier on Solana devnet</p>
                          </div>
                          <div className="flex gap-3">
                            <a href="/activate" className="text-[9px] font-bold tracking-wider text-[#c4a44e] uppercase">Activate</a>
                            <button onClick={() => { localStorage.setItem("txline_permanent_token","demo_txline_token"); location.reload(); }}
                              className="text-[9px] tracking-wider text-[#3a3228] uppercase">Demo</button>
                          </div>
                        </div>
                      </div>
                    )}
                    <StreakGame externalFixtureId={selectedFixtureId} hideLeaderboard />
                  </div>
                )}
                {tab === "schedule" && <div className="anim-up"><MatchSchedule onPickId={onSchedulePick} /></div>}
                {tab === "rewards" && (
                  <div className="anim-up space-y-4">
                    <div className="card rounded-xl p-5">
                      <h3 className="text-[12px] font-bold text-[#f0ebe0] uppercase tracking-wider mb-4">How Streaks Work</h3>
                      <div className="space-y-3 text-[11px] text-[#7a7060]">
                        {[
                          { mark: "+1", color: "#2ecc71", t: "Correct extends streak", d: "Each correct Higher/Lower guess adds to your run" },
                          { mark: "0", color: "#e74c3c", t: "Wrong resets to zero", d: "One miss resets everything" },
                          { mark: ">>", color: "#c4a44e", t: "Carry across matches", d: "Switch between any match freely" },
                        ].map(r => (
                          <div key={r.t} className="flex gap-3">
                            <div className="shrink-0 w-7 h-7 rounded flex items-center justify-center text-[9px] font-black" style={{ background: `${r.color}12`, color: r.color }}>{r.mark}</div>
                            <div><span className="text-[#d4c9b0] font-semibold uppercase tracking-wide text-[10px]">{r.t}</span><br/>{r.d}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-[12px] font-bold text-[#f0ebe0] uppercase tracking-wider">Prize Pool</h3>
                        <span className="text-[7px] font-bold tracking-[0.15em] text-[#c4a44e] bg-[#c4a44e]/8 px-2 py-0.5 rounded border border-[#c4a44e]/12">COMING SOON</span>
                      </div>
                      <div className="space-y-3 text-[11px] text-[#7a7060]">
                        <div><span className="text-[#d4c9b0] font-semibold uppercase tracking-wide text-[10px]">Daily streak champion</span><br/>Highest streak each match day wins SOL</div>
                        <div><span className="text-[#d4c9b0] font-semibold uppercase tracking-wide text-[10px]">Friend leagues — 0.05 SOL</span><br/>Create private groups, winner takes all</div>
                        <div><span className="text-[#d4c9b0] font-semibold uppercase tracking-wide text-[10px]">On-chain verified</span><br/>Predictions anchored on Solana via TxLINE</div>
                      </div>
                    </div>
                    <div className="card rounded-xl p-5">
                      <h3 className="text-[12px] font-bold text-[#f0ebe0] uppercase tracking-wider mb-3">Powered by TxLINE</h3>
                      <p className="text-[10px] text-[#7a7060] leading-relaxed mb-3">Real-time sports data API on Solana. Blockchain-verified. Same infrastructure used by professional traders.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["Fixtures","Scores SSE","Odds","Validation","Merkle Proofs"].map(f => (
                          <span key={f} className="text-[8px] font-semibold tracking-wider text-[#5a5040] uppercase border border-[#2a2420]/50 px-2 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDEBAR */}
              <div className="hidden xl:block w-[280px] shrink-0 space-y-4">
                <div className="card rounded-xl p-5 card-shine">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-[#5a5040] uppercase mb-4">Your Stats</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className={`text-[38px] font-black tabular-nums leading-none ${streak >= 5 ? "text-[#c4a44e] streak-glow" : "text-[#f0ebe0]"}`}>{streak}</div>
                      <div className="text-[8px] font-bold tracking-[0.2em] text-[#5a5040] uppercase mt-2">Current Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[38px] font-black tabular-nums leading-none text-[#3a3228]">{best}</div>
                      <div className="text-[8px] font-bold tracking-[0.2em] text-[#5a5040] uppercase mt-2">Personal Best</div>
                    </div>
                  </div>
                  {streak >= 3 && (
                    <div className="mt-4 pt-3 border-t border-[#2a2420]/40 text-center">
                      <span className="text-[9px] font-bold tracking-wider text-[#c4a44e]/50 uppercase">
                        {streak >= 10 ? "Legendary run" : streak >= 7 ? "On fire" : streak >= 5 ? "Hot streak" : "Building momentum"}
                      </span>
                    </div>
                  )}
                </div>

                <Leaderboard currentStreak={streak} />

                <div className="card rounded-xl p-4">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-[#5a5040] uppercase mb-3">Quick Info</div>
                  <div className="space-y-2.5 text-[10px] text-[#7a7060]">
                    {[
                      { l: "Data source", v: "TxLINE devnet" },
                      { l: "Network", v: "Solana" },
                      { l: "Verification", v: "On-chain" },
                      { l: "Entry fee", v: "Free", c: "#2ecc71" },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between">
                        <span>{r.l}</span>
                        <span className="font-semibold" style={{ color: (r as any).c || "#d4c9b0" }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
