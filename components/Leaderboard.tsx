"use client";

import { useState, useEffect } from "react";

const MOCK_GLOBAL = [
  { name: "kaito.sol", streak: 14, flag: "jp" },
  { name: "moyo_ng", streak: 12, flag: "ng" },
  { name: "lara_arg", streak: 11, flag: "ar" },
  { name: "marcus_usa", streak: 9, flag: "us" },
  { name: "sofia_br", streak: 8, flag: "br" },
];

const MOCK_LEAGUE_STANDINGS: Record<string, { name: string; streak: number; flag: string; me?: boolean }[]> = {
  league_wc2026: [
    { name: "kaito.sol", streak: 14, flag: "jp" },
    { name: "marcus_usa", streak: 9, flag: "us" },
    { name: "you", streak: 0, flag: "ng", me: true },
  ],
  league_superteam: [
    { name: "moyo_ng", streak: 12, flag: "ng" },
    { name: "you", streak: 0, flag: "ng", me: true },
  ],
  league_degen: [
    { name: "lara_arg", streak: 11, flag: "ar" },
    { name: "you", streak: 0, flag: "ng", me: true },
  ],
};

export default function Leaderboard({ currentStreak = 0 }: { currentStreak?: number }) {
  const [boardTab, setBoardTab] = useState<"global" | "friends">("global");
  const [joinedLeagues, setJoinedLeagues] = useState<string[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("league_wc2026");

  useEffect(() => {
    const saved = localStorage.getItem("streakline_joined_leagues");
    if (saved) {
      const parsed = JSON.parse(saved);
      setJoinedLeagues(parsed);
      if (parsed.length > 0 && !parsed.includes(selectedLeagueId)) {
        setSelectedLeagueId(parsed[0]);
      }
    }
  }, [currentStreak]);

  // Global board lists
  const globalList = [...MOCK_GLOBAL, { name: "you", streak: currentStreak, flag: "ng", me: true }]
    .sort((a, b) => b.streak - a.streak)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Friend board list based on selected joined league
  const getFriendList = () => {
    const base = MOCK_LEAGUE_STANDINGS[selectedLeagueId] || [];
    return base
      .map(r => r.me ? { ...r, streak: currentStreak } : r)
      .sort((a, b) => b.streak - a.streak)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  };

  const currentList = boardTab === "global" ? globalList : getFriendList();

  return (
    <div className="glass-panel rounded-2xl overflow-hidden bg-black/50 border-[#3a473a]/40">
      {/* Tabs */}
      <div className="flex border-b border-[#3a473a]/30">
        <button
          onClick={() => setBoardTab("global")}
          className={`flex-1 py-3 text-[9px] font-black tracking-widest uppercase transition-all ${
            boardTab === "global" ? "bg-[#d4af37]/10 text-[#d4af37]" : "text-[#6b7c6b] hover:text-[#d2dcd2]"
          }`}
        >
          Global Arena
        </button>
        <button
          onClick={() => setBoardTab("friends")}
          className={`flex-1 py-3 text-[9px] font-black tracking-widest uppercase transition-all ${
            boardTab === "friends" ? "bg-[#d4af37]/10 text-[#d4af37]" : "text-[#6b7c6b] hover:text-[#d2dcd2]"
          }`}
        >
          My Leagues
        </button>
      </div>

      {/* Friend League Selector */}
      {boardTab === "friends" && joinedLeagues.length > 0 && (
        <div className="px-3 pt-3">
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            className="w-full bg-[#0f140f]/60 border border-[#3a473a]/40 rounded-lg py-1.5 px-3 text-[10px] font-bold text-[#d2dcd2] focus:outline-none focus:border-[#d4af37]"
          >
            {joinedLeagues.includes("league_wc2026") && <option value="league_wc2026">World Cup Elite Pool</option>}
            {joinedLeagues.includes("league_superteam") && <option value="league_superteam">Superteam Nigeria Sweep</option>}
            {joinedLeagues.includes("league_degen") && <option value="league_degen">Degen Hi-Lo Arena</option>}
          </select>
        </div>
      )}

      {/* Leaderboard rows */}
      <div className="p-3 space-y-1">
        {boardTab === "friends" && joinedLeagues.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-[10px] text-[#6b7c6b] block">No active friend leagues.</span>
            <span className="text-[8.5px] text-[#d4af37] mt-1 block">Go to Leagues tab to join one!</span>
          </div>
        ) : (
          currentList.map((r: any) => {
            const isRank1 = r.rank === 1;
            const isRank2 = r.rank === 2;
            const isRank3 = r.rank === 3;
            
            return (
              <div
                key={r.name}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all ${
                  r.me
                    ? "bg-[#d4af37]/10 border-[#d4af37]/20 shadow-[0_0_12px_rgba(212,175,55,0.05)]"
                    : "border-transparent bg-black/20 hover:bg-[#3a473a]/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Glowing rank badges */}
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black tabular-nums border ${
                      isRank1
                        ? "bg-[#d4af37]/15 border-[#d4af37]/35 text-[#d4af37] glow-gold"
                        : isRank2
                          ? "bg-[#00f0ff]/15 border-[#00f0ff]/35 text-[#00f0ff] glow-cyan"
                          : isRank3
                            ? "bg-[#ff2255]/15 border-[#ff2255]/35 text-[#ff2255] glow-crimson"
                            : "bg-transparent border-transparent text-[#6b7c6b]"
                    }`}
                  >
                    {r.rank}
                  </span>

                  <img src={`https://flagcdn.com/w20/${r.flag}.png`} alt="" width={15} height={10} className="rounded-sm object-cover shadow" />
                  <span className={`text-[11px] font-bold ${r.me ? "text-[#d4af37]" : "text-[#d2dcd2]"}`}>
                    {r.name}
                  </span>
                  {r.me && (
                    <span className="text-[7px] font-black bg-[#d4af37]/12 text-[#d4af37] px-1.5 py-0.5 rounded tracking-widest border border-[#d4af37]/15">
                      YOU
                    </span>
                  )}
                </div>

                <span className={`text-[14px] font-black tabular-nums ${r.me ? "text-[#d4af37]" : "text-[#f4f6f4]"}`}>
                  {r.streak}
                </span>
              </div>
            );
          })
        )}
      </div>
      
      <div className="px-4 py-3 bg-black/20 border-t border-[#3a473a]/30 flex justify-between items-center text-[8px] font-bold tracking-widest uppercase text-[#6b7c6b]">
        <span>STAKE VALUE: 0.05 SOL</span>
        <span className="text-[#00ff88]">ON-CHAIN MATCH</span>
      </div>
    </div>
  );
}
