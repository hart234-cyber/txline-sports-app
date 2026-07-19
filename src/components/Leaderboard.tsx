"use client";

import { useState, useEffect } from "react";

const MOCK_GLOBAL = [
  { name: "kaito.sol", streak: 14, flag: "jp" },
  { name: "moyo_ng", streak: 12, flag: "ng" },
  { name: "lara_arg", streak: 11, flag: "ar" },
  { name: "marcus_usa", streak: 9, flag: "us" },
  { name: "sofia_br", streak: 8, flag: "br" },
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
        name: u.username || (u.walletAddress?.slice(0, 8) + "..."),
        streak: u.bestStreak,
        flag: "un",
        me: false,
        rank: i + 1,
      }))
    : [...MOCK_GLOBAL, { name: "you", streak: currentStreak, flag: "ng", me: true }]
        .sort((a, b) => b.streak - a.streak)
        .map((r, i) => ({ ...r, rank: i + 1 }));

  const rankColors: Record<number, string> = {
    1: "text-yellow-400",
    2: "text-slate-300",
    3: "text-orange-400",
  };

  return (
    <div className="space-y-1 p-1">
      {list.slice(0, 6).map((r: any) => (
        <div key={r.name}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
            r.me ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-white/[0.03]"
          }`}>
          <span className={`text-[11px] font-black w-5 text-center tabular-nums ${rankColors[r.rank] || "text-slate-600"}`}>
            {r.rank}
          </span>
          <img
            src={`https://flagcdn.com/w20/${r.flag}.png`}
            alt=""
            width={14}
            height={10}
            className="rounded-sm object-cover opacity-70"
          />
          <span className={`text-[11px] font-bold flex-1 truncate ${r.me ? "text-blue-400" : "text-slate-300"}`}>
            {r.name}
            {r.me && <span className="ml-1 text-[8px] font-black text-blue-400 opacity-70">YOU</span>}
          </span>
          <span className={`text-[13px] font-black tabular-nums ${r.me ? "text-blue-400" : "text-white"}`}>
            {r.streak}
          </span>
        </div>
      ))}
    </div>
  );
}
