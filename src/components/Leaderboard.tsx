"use client";

import { useState, useEffect } from "react";

const MOCK_GLOBAL = [
  { name: "kaito.sol", streak: 14, wallet: "7xKp...3mNq", flag: "jp" },
  { name: "moyo_ng", streak: 12, wallet: "9aRt...8vWx", flag: "ng" },
  { name: "lara_arg", streak: 11, wallet: "3bYu...2kLp", flag: "ar" },
  { name: "marcus_usa", streak: 9, wallet: "5cZi...6jMn", flag: "us" },
  { name: "sofia_br", streak: 8, wallet: "1dAo...4hOq", flag: "br" },
];

export default function Leaderboard({ currentStreak = 0 }: { currentStreak?: number }) {
  const [liveData, setLiveData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then(d => { if (d.success && d.leaderboard?.length) setLiveData(d.leaderboard); })
      .catch(() => {});
  }, [currentStreak]);

  const list = liveData.length > 0
    ? liveData.map((u, i) => ({
        name: u.username || (u.walletAddress ? (u.walletAddress.slice(0, 8) + "...") : "Anonymous"),
        streak: u.bestStreak,
        wallet: u.walletAddress || "",
        flag: "un",
        me: false,
        rank: i + 1,
      }))
    : [...MOCK_GLOBAL, { name: "you", streak: currentStreak, wallet: "YourWallet.sol", flag: "ng", me: true }]
        .sort((a, b) => b.streak - a.streak)
        .map((r, i) => ({ ...r, rank: i + 1 }));

  const rankColors: Record<number, string> = {
    1: "text-[#e8c84a]",
    2: "text-slate-300",
    3: "text-orange-400",
  };

  return (
    <div className="space-y-1 p-1">
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-[8px] font-black tracking-[0.2em] text-[#3d4f6a] uppercase">Global Leaderboard</span>
        <span className="text-[8px] font-mono text-[#3d4f6a]">Verified on Solana Devnet</span>
      </div>
      {list.slice(0, 6).map((r: any) => (
        <a
          key={r.name}
          href={r.wallet ? `https://explorer.solana.com/address/${r.wallet}?cluster=devnet` : undefined}
          target={r.wallet ? "_blank" : undefined}
          rel={r.wallet ? "noopener noreferrer" : undefined}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all border ${
            r.me ? "bg-[#e8c84a]/8 border-[#e8c84a]/20 hover:bg-[#e8c84a]/14" : "bg-black/20 border-transparent hover:bg-white/[0.03] hover:border-white/[0.04]"
          }`}
        >
          <span className={`text-[11px] font-black w-5 text-center tabular-nums shrink-0 ${rankColors[r.rank] || "text-slate-600"}`}>
            {r.rank}
          </span>
          <img
            src={`https://flagcdn.com/w20/${r.flag}.png`}
            alt=""
            width={14}
            height={10}
            className="rounded-sm object-cover opacity-70 shrink-0"
          />
          <span className={`text-[11px] font-bold flex-1 truncate ${r.me ? "text-[#e8c84a]" : "text-slate-200"}`}>
            {r.name}
            {r.me && <span className="ml-1.5 text-[7px] font-black text-[#e8c84a] bg-[#e8c84a]/10 px-1.5 py-0.5 rounded-full">YOU</span>}
          </span>
          <span className={`text-[13px] font-black tabular-nums shrink-0 ${r.me ? "text-[#e8c84a]" : "text-white"}`}>
            {r.streak}
          </span>
          {r.wallet && (
            <span className="text-[8px] font-mono text-[#3d4f6a] shrink-0 hidden sm:inline-block">{r.wallet.slice(0, 4)}...{r.wallet.slice(-4)}</span>
          )}
        </a>
      ))}
    </div>
  );
}
