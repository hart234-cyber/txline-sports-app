"use client";

import { useEffect, useState, useCallback } from "react";
import StreakGame from "@/components/StreakGame";
import MatchSchedule from "@/components/MatchSchedule";
import Leaderboard from "@/components/Leaderboard";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import dynamic from "next/dynamic";
import Link from "next/link";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Dashboard() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"play" | "schedule" | "rewards">("play");
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  // Solana Friend League Transaction State
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [joinedLeagues, setJoinedLeagues] = useState<string[]>([]);
  const [leagueTxStatus, setLeagueTxStatus] = useState<string | null>(null);

  const [tgToken, setTgToken] = useState("");
  const [tgChat, setTgChat] = useState("");
  const [tgActive, setTgActive] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem("txline_permanent_token");
    if (k) setApiKey(k);

    const savedLeagues = localStorage.getItem("streakline_joined_leagues");
    if (savedLeagues) setJoinedLeagues(JSON.parse(savedLeagues));

    setTgToken(localStorage.getItem("streakline_tg_token") || "");
    setTgChat(localStorage.getItem("streakline_tg_chat") || "");
    setTgActive(localStorage.getItem("streakline_tg_active") === "true");

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

  // Solana Transaction Execution for Friend Leagues
  const joinFriendLeague = async (leagueId: string, leagueName: string) => {
    if (!publicKey || !sendTransaction) {
      setLeagueTxStatus("Please connect your wallet first.");
      return;
    }
    
    setLeagueLoading(true);
    setLeagueTxStatus(`Submitting 0.05 SOL entry fee for ${leagueName}...`);

    try {
      // Mock tourney chest address (treasury wallet)
      const treasury = new PublicKey("G3D67H4f2JjYqmZqG83A4T727Xg1mP6B6w7R9yQ8xZkY");
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasury,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      setLeagueTxStatus("Awaiting transaction confirmation on Solana devnet...");
      
      await connection.confirmTransaction(signature, "confirmed");
      
      const updated = [...joinedLeagues, leagueId];
      setJoinedLeagues(updated);
      localStorage.setItem("streakline_joined_leagues", JSON.stringify(updated));
      
      setLeagueTxStatus(`Success! Joined ${leagueName}. Tx: ${signature.slice(0, 16)}...`);
    } catch (e: any) {
      console.error(e);
      setLeagueTxStatus(`Transaction failed: ${e.message || "User rejected signature"}`);
    } finally {
      setLeagueLoading(false);
    }
  };

  const claimEscrowReward = async () => {
    if (!publicKey) {
      setLeagueTxStatus("Please connect your wallet first.");
      return;
    }
    
    setLeagueLoading(true);
    setLeagueTxStatus("Connecting to reward escrow oracle...");

    try {
      const res = await fetch("/api/txline-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: publicKey.toBase58() }),
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Solana RPC congestion error");
      }
      
      setLeagueTxStatus(`Success! Paid 0.02 SOL from Escrow. Signature: ${data.signature.slice(0, 20)}...`);
    } catch (e: any) {
      setLeagueTxStatus(`Claim failed: ${e.message}`);
    } finally {
      setLeagueLoading(false);
    }
  };

  const sideNav = [
    { id: "play" as const, label: "Console", d: "M5 3l14 9-14 9V3z" },
    { id: "schedule" as const, label: "Fixtures", d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { id: "rewards" as const, label: "Leagues", d: "M12 15l-2 5h4l-2-5zm0 0l6-10H6l6 10z" },
  ];

  return (
    <main className="min-h-screen relative py-4">
      {/* Stadium grid and glow backgrounds */}
      <div className="stadium-glow" />
      <div className="terminal-grid" />

      <div className="relative flex min-h-screen z-10 max-w-[1700px] mx-auto px-4 sm:px-6">
        {/* ═══ LEFT SIDEBAR ═══ */}
        <aside className="hidden lg:flex flex-col w-[220px] min-h-[calc(100vh-32px)] glass-panel rounded-3xl p-5 shrink-0 fixed left-4 top-4 bottom-4 z-30 bg-black/60 border-[#d4af37]/10">
          <Link href="/" className="flex items-center gap-3 mb-10 px-2 group">
            <div className="w-9 h-9 rounded-xl border border-[#d4af37]/20 flex items-center justify-center bg-black/40 shadow-[0_0_12px_rgba(212,175,55,0.15)]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" className="glow-gold">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-black text-[#f4f6f4] tracking-widest leading-none group-hover:text-[#d4af37] transition-colors">STREAKLINE</div>
              <div className="text-[6.5px] font-black text-[#d4af37]/60 tracking-[0.3em] mt-1">TERMINAL</div>
            </div>
          </Link>

          <div className="space-y-2 flex-1">
            {sideNav.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all ${
                  tab === item.id
                    ? "bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/15 shadow-[inset_0_0_12px_rgba(212,175,55,0.05)]"
                    : "text-[#6b7c6b] hover:text-[#d2dcd2] hover:bg-white/3 border border-transparent"
                }`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.d} />
                </svg>
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-5 border-t border-[#3a473a]/40 space-y-4 px-2">
            <Link href="/activate" className="block text-[9px] font-bold tracking-[0.18em] text-[#6b7c6b] hover:text-[#00f0ff] uppercase transition-colors">
              TxLINE Setup
            </Link>
            <div className="flex items-center gap-2 text-[8px] text-[#6b7c6b]">
              <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
              <span className="tracking-widest font-black uppercase">Solana Devnet</span>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN AREA ═══ */}
        <div className="flex-1 lg:ml-[240px]">
          {/* Header */}
          <header className="sticky top-4 z-20 glass-panel rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex flex-col lg:flex-row items-center justify-between gap-3 bg-black/90 border-[#d4af37]/10 mb-6">
            <div className="w-full flex items-center justify-between lg:w-auto lg:justify-start gap-4">
              {/* Mobile Brand */}
              <div className="lg:hidden flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-[#d4af37]/15 flex items-center justify-center bg-black/40">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>
                  </div>
                  <span className="text-[12px] font-black text-[#f4f6f4] tracking-widest hidden min-[400px]:block">STREAKLINE</span>
                </Link>
              </div>

              {/* Wallet Button */}
              <div className="flex items-center gap-3">
                {!apiKey && (
                  <Link href="/activate" className="hidden sm:block text-[9px] font-black tracking-widest text-[#d4af37]/80 hover:text-white uppercase transition-colors">
                    Get Dev Token
                  </Link>
                )}
                <WalletMultiButton />
              </div>
            </div>

            {/* Mobile tabs */}
            <div className="lg:hidden w-full sm:w-auto flex justify-center">
              <div className="flex gap-1 rounded-xl p-1 bg-black/40 border border-[#3a473a]/40 w-full sm:w-auto justify-around">
                {sideNav.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all text-center ${
                      tab === t.id ? "bg-[#d4af37]/10 text-[#d4af37]" : "text-[#6b7c6b]"
                    }`}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Desktop breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-[10px] tracking-widest font-black uppercase">
              <span className="text-[#6b7c6b]">Terminal</span>
              <span className="text-[#3a473a]">/</span>
              <span className="text-[#d4af37] font-extrabold">{tab}</span>
            </div>
          </header>

          {/* Core Content Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-12">
            {/* Left Content Area (Columns: 8) */}
            <div className="xl:col-span-8 min-w-0 space-y-6">
              {tab === "play" && (
                <div className="anim-up">
                  {!apiKey && (
                    <div className="glass-panel glass-panel-cyan rounded-2xl p-4 flex items-center justify-between mb-6 bg-black/40">
                      <div>
                        <div className="text-[12px] font-black text-[#f4f6f4] uppercase tracking-wider">Demo Preview Active</div>
                        <p className="text-[10px] text-[#6b7c6b] mt-0.5">Activate on-chain to connect live World Cup feeds.</p>
                      </div>
                      <div className="flex gap-4 items-center">
                        <button onClick={() => { localStorage.setItem("txline_permanent_token", "demo_txline_token"); location.reload(); }}
                          className="text-[9px] font-black tracking-widest text-[#6b7c6b] hover:text-[#d2dcd2] uppercase">Use Demo</button>
                        <Link href="/activate" className="text-[9px] font-black tracking-widest text-[#00f0ff] uppercase">Setup Guide →</Link>
                      </div>
                    </div>
                  )}
                  <StreakGame externalFixtureId={selectedFixtureId} hideLeaderboard />
                </div>
              )}

              {tab === "schedule" && (
                <div className="anim-up">
                  <MatchSchedule onPickId={onSchedulePick} />
                </div>
              )}

              {tab === "rewards" && (
                <div className="anim-up space-y-6">
                  {/* Solana tx status feedback */}
                  {leagueTxStatus && (
                    <div className="glass-panel glass-panel-cyan rounded-2xl p-4 bg-[#00f0ff]/5 border-[#00f0ff]/20 anim-pop">
                      <span className="text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider block">Solana transaction monitor</span>
                      <p className="text-[11px] text-[#d2dcd2] mt-1 font-mono">{leagueTxStatus}</p>
                    </div>
                  )}

                  {/* Leagues lists */}
                  <div className="glass-panel rounded-2xl p-6 bg-black/50 border-[#d4af37]/10">
                    <h3 className="text-[13px] font-black text-[#f4f6f4] uppercase tracking-widest mb-4">Solana Friend Leagues</h3>
                    <p className="text-[11px] text-[#6b7c6b] mb-6 leading-relaxed">
                      Pool entry fees in escrow, compete on stats correctness, and claim the treasury on streak verification. entry fee is **0.05 SOL** on Devnet.
                    </p>

                    <div className="space-y-4">
                      {[
                        { id: "league_wc2026", name: "World Cup Elite Pool", pool: "3.45 SOL", members: 69 },
                        { id: "league_superteam", name: "Superteam Nigeria Sweep", pool: "1.20 SOL", members: 24 },
                        { id: "league_degen", name: "Degen Hi-Lo Arena", pool: "0.85 SOL", members: 17 },
                      ].map(l => {
                        const joined = joinedLeagues.includes(l.id);
                        return (
                          <div key={l.id} className="flex items-center justify-between p-4 rounded-xl border border-[#3a473a]/40 bg-[#0f140f]/40 hover:border-[#6b7c6b]/35 transition-all">
                            <div>
                              <span className="text-[12px] font-black text-[#f4f6f4] uppercase tracking-wide block">{l.name}</span>
                              <span className="text-[9px] text-[#6b7c6b] tracking-wider mt-1 block">
                                {l.members} Players · Pool: <strong className="text-[#00ff88]">{l.pool}</strong>
                              </span>
                            </div>
                            
                            <button
                              disabled={leagueLoading || joined}
                              onClick={() => joinFriendLeague(l.id, l.name)}
                              className={`h-10 px-5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${
                                joined
                                  ? "border border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88]"
                                  : "bg-[#d4af37] text-black hover:bg-[#f4e8c1] shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                              }`}>
                              {joined ? "✓ Active" : "Stake 0.05 SOL"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rules of Streaks */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-panel rounded-2xl p-6 bg-black/40 border-[#3a473a]/40">
                      <h4 className="text-[11px] font-black text-[#f4f6f4] uppercase tracking-widest mb-3">Streak Protocols</h4>
                      <div className="space-y-3.5 text-[11px] text-[#6b7c6b]">
                        <div className="flex gap-3">
                          <span className="text-[#00ff88] font-black text-xs leading-none">1.</span>
                          <p>Correct prediction increments active streak by +1. Best streak is saved locally.</p>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-[#ff2255] font-black text-xs leading-none">2.</span>
                          <p>Incorrect prediction resets active streak immediately back to zero.</p>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-[#d4af37] font-black text-xs leading-none">3.</span>
                          <p>You can transition across matches. Streak carries forward globally.</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel rounded-2xl p-6 bg-black/40 border-[#3a473a]/40">
                      <h4 className="text-[11px] font-black text-[#f4f6f4] uppercase tracking-widest mb-3">Verification Specs</h4>
                      <p className="text-[11px] text-[#6b7c6b] leading-relaxed mb-4">
                        All stat outcomes are verified on-chain. The system query utilizes TxLINE Merkle roots to ensure results are untampered before distribution.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {["Merkle Proofs", "Solana Devnet", "Free SL1 Tier"].map(f => (
                          <span key={f} className="text-[8px] font-bold text-zinc-400 border border-[#3a473a]/60 px-2 py-1 rounded bg-black/20 uppercase tracking-widest">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel (Columns: 4) */}
            <div className="xl:col-span-4 space-y-6">
              {/* Stats Box */}
              <div className="glass-panel rounded-2xl p-6 card-shine border-[#d4af37]/10 bg-black/50">
                <span className="text-[9px] font-black tracking-[0.25em] text-[#6b7c6b] uppercase block mb-4">Terminal Standings</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-xl bg-[#0f140f]/60 border border-[#3a473a]/40">
                    <div className={`text-[42px] font-black tabular-nums leading-none tracking-tighter ${
                      streak >= 5 ? "emerald-text-grad glow-emerald" : "text-[#f4f6f4]"
                    }`}>{streak}</div>
                    <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block mt-2">Active Streak</span>
                  </div>

                  <div className="text-center p-3 rounded-xl bg-[#0f140f]/60 border border-[#3a473a]/40">
                    <div className="text-[42px] font-black tabular-nums leading-none tracking-tighter text-[#3a473a]">{best}</div>
                    <span className="text-[8px] font-bold tracking-[0.2em] text-[#6b7c6b] uppercase block mt-2">Personal Best</span>
                  </div>
                </div>

                {streak >= 3 && (
                  <div className="mt-4 pt-3 border-t border-[#3a473a]/40 text-center">
                    <span className="text-[9px] font-black tracking-widest text-[#00ff88] uppercase block">
                      {streak >= 10 ? "LEGENDARY PREDICTOR" : streak >= 7 ? "STREAK MASTER" : "HEAT RISING"}
                    </span>
                  </div>
                )}
              </div>

              {/* Escrow claim box */}
              {streak >= 3 && (
                <div className="glass-panel rounded-2xl p-5 border-[#00f0ff]/20 bg-[#00f0ff]/5 anim-pop relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-10 pointer-events-none" />
                  <div className="relative">
                    <span className="text-[8px] font-black text-[#00f0ff] uppercase tracking-[0.2em] block mb-1">STREAK ESCROW DETECTED</span>
                    <h4 className="text-xs font-black text-[#f4f6f4] uppercase tracking-wide">0.02 SOL Reward Payout</h4>
                    <p className="text-[10px] text-[#6b7c6b] mt-1.5 leading-relaxed">
                      Your streak is 3+. You can claim your reward directly from the devnet tournament treasury.
                    </p>
                    <button
                      disabled={leagueLoading}
                      onClick={claimEscrowReward}
                      className="mt-4 w-full h-10 rounded-xl bg-[#00f0ff] text-black hover:bg-white disabled:bg-[#3a473a] disabled:text-[#6b7c6b] font-black text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] cursor-pointer"
                    >
                      {leagueLoading ? "Processing claim..." : "Claim 0.02 SOL"}
                    </button>
                  </div>
                </div>
              )}

              {/* Leaderboard Panel */}
              <Leaderboard currentStreak={streak} />

              {/* Telegram Pundit Bot Config */}
              <div className="glass-panel rounded-2xl p-5 border-[#3a473a]/40 bg-black/40 relative overflow-hidden">
                <span className="text-[9px] font-black tracking-[0.25em] text-[#d4af37] uppercase block mb-3">AI Telegram Bot Oracle</span>
                <p className="text-[10px] text-[#6b7c6b] mb-4 leading-relaxed">
                  Broadcast live AI match punditry comments (passionate goal alerts, odds shifts) directly to your Telegram channel.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[8px] font-bold text-[#6b7c6b] uppercase block mb-1">Telegram Bot Token</label>
                    <input
                      type="password"
                      placeholder="e.g. 123456:ABC-DEF..."
                      value={tgToken}
                      onChange={e => {
                        setTgToken(e.target.value);
                        localStorage.setItem("streakline_tg_token", e.target.value);
                      }}
                      className="w-full bg-black/50 border border-[#3a473a]/60 rounded-lg px-3 py-1.5 text-[10px] text-[#f4f6f4] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[#6b7c6b] uppercase block mb-1">Telegram Chat ID</label>
                    <input
                      type="text"
                      placeholder="e.g. -1001234567"
                      value={tgChat}
                      onChange={e => {
                        setTgChat(e.target.value);
                        localStorage.setItem("streakline_tg_chat", e.target.value);
                      }}
                      className="w-full bg-black/50 border border-[#3a473a]/60 rounded-lg px-3 py-1.5 text-[10px] text-[#f4f6f4] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-[#d2dcd2] font-semibold">Enable Live Alerts</span>
                    <button
                      onClick={() => {
                        const nextVal = !tgActive;
                        setTgActive(nextVal);
                        localStorage.setItem("streakline_tg_active", String(nextVal));
                      }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-all ${
                        tgActive ? "bg-[#00ff88] text-right" : "bg-[#3a473a] text-left"
                      }`}
                    >
                      <span className="inline-block w-4 h-4 rounded-full bg-black shadow" />
                    </button>
                  </div>

                  <button
                    disabled={leagueLoading || !tgToken || !tgChat}
                    onClick={async () => {
                      setLeagueLoading(true);
                      setLeagueTxStatus("Broadcasting test pundit commentary...");
                      try {
                        const res = await fetch("/api/telegram-pundit", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            botToken: tgToken,
                            chatId: tgChat,
                            eventType: "test",
                            homeTeam: "France",
                            awayTeam: "Spain"
                          })
                        });
                        const resJson = await res.json();
                        if (resJson.success) {
                          setLeagueTxStatus("Broadcast success! Check Telegram chat.");
                        } else {
                          throw new Error(resJson.error || "Failed to broadcast");
                        }
                      } catch (e: any) {
                        setLeagueTxStatus(`Broadcast error: ${e.message}`);
                      } finally {
                        setLeagueLoading(false);
                      }
                    }}
                    className="w-full h-8 rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] font-black text-[8px] tracking-widest uppercase transition-all cursor-pointer mt-2"
                  >
                    Send Test Alert
                  </button>
                </div>
              </div>

              {/* Info Frame */}
              <div className="glass-panel rounded-2xl p-5 border-[#3a473a]/40 bg-black/30">
                <span className="text-[9px] font-black tracking-[0.25em] text-[#6b7c6b] uppercase block mb-3">System Constants</span>
                <div className="space-y-3 text-[10px] text-[#6b7c6b] font-mono">
                  {[
                    { l: "ORACLE SOURCE", v: "TxLINE v1.5.6" },
                    { l: "NETWORK", v: "SOLANA DEVNET" },
                    { l: "STAKE PROTOCOL", v: "SPL TOKEN 2022" },
                    { l: "SL TIER VALUE", v: "SERVICE LEVEL 1" },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between items-center border-b border-[#3a473a]/20 pb-1.5 last:border-0 last:pb-0">
                      <span>{r.l}</span>
                      <span className="font-extrabold text-[#d2dcd2] text-right">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
