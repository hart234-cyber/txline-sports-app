"use client";

const MOCK = [
  { name: "kaito.sol", streak: 14, flag: "jp" },
  { name: "moyo_ng", streak: 12, flag: "ng" },
  { name: "lara_arg", streak: 11, flag: "ar" },
  { name: "marcus_usa", streak: 9, flag: "us" },
  { name: "sofia_br", streak: 8, flag: "br" },
];

export default function Leaderboard({ currentStreak = 0 }: { currentStreak?: number }) {
  const all = [...MOCK, { name: "you", streak: currentStreak, flag: "", me: true }]
    .sort((a, b) => b.streak - a.streak)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const top = all.slice(0, 5);
  const me = all.find((r: any) => r.me);
  const meInTop = top.some((r: any) => r.me);

  return (
    <div className="card rounded-xl overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#2a2420]/30">
        <span className="text-[10px] font-bold text-[#f0ebe0] uppercase tracking-wider">Leaderboard</span>
        <span className="text-[8px] font-semibold text-[#5a5040] uppercase tracking-wider">Today</span>
      </div>
      <div className="px-2 py-2 space-y-0.5">
        {top.map((r: any) => (
          <div key={r.name} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
            r.me ? "bg-[#c4a44e]/10 border border-[#c4a44e]/12" : "hover:bg-[#c4a44e]/4"
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-5 text-[10px] font-bold tabular-nums ${r.me ? "text-[#c4a44e]" : r.rank <= 3 ? "text-[#c4a44e]/70" : "text-[#3a3228]"}`}>{r.rank}</span>
              {r.flag ? <img src={`https://flagcdn.com/w20/${r.flag}.png`} alt="" width={14} height={10} className="rounded-sm"/> : <div className="w-3.5 h-2.5 rounded-sm bg-[#c4a44e]/15"/>}
              <span className={`text-[11px] font-semibold ${r.me ? "text-[#c4a44e]" : "text-[#b0a890]"}`}>{r.name}</span>
              {r.me && <span className="text-[7px] font-bold bg-[#c4a44e]/12 text-[#c4a44e] px-1.5 py-0.5 rounded tracking-wider">YOU</span>}
            </div>
            <span className={`text-[13px] font-extrabold tabular-nums ${r.me ? "text-[#c4a44e]" : r.rank <= 3 ? "text-[#c4a44e]/70" : "text-[#5a5040]"}`}>{r.streak}</span>
          </div>
        ))}
        {!meInTop && me && (
          <>
            <div className="text-center text-[8px] text-[#2a2420] py-0.5 tracking-widest">...</div>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#c4a44e]/10 border border-[#c4a44e]/12">
              <div className="flex items-center gap-2.5">
                <span className="w-5 text-[10px] font-bold text-[#c4a44e] tabular-nums">{me.rank}</span>
                <div className="w-3.5 h-2.5 rounded-sm bg-[#c4a44e]/15"/>
                <span className="text-[11px] font-semibold text-[#c4a44e]">you</span>
                <span className="text-[7px] font-bold bg-[#c4a44e]/12 text-[#c4a44e] px-1.5 py-0.5 rounded tracking-wider">YOU</span>
              </div>
              <span className="text-[13px] font-extrabold tabular-nums text-[#c4a44e]">{me.streak}</span>
            </div>
          </>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-[#2a2420]/30 flex items-center justify-between text-[8px] tracking-wider uppercase">
        <span className="text-[#3a3228]">Friend leagues — 0.05 SOL</span>
        <span className="font-semibold text-[#c4a44e]/40">Coming soon</span>
      </div>
    </div>
  );
}
