"use client";

import { flagUrl, type Fixture } from "@/lib/txline-client";

export default function MatchRail({ fixtures, activeId, onPick }: {
  fixtures: Fixture[];
  activeId?: number;
  onPick: (f: Fixture) => void;
}) {
  if (!fixtures.length) return null;

  return (
    <div className="w-full overflow-x-auto hide-sb">
      <div className="flex gap-2.5 pb-2 pt-1 min-w-max">
        {fixtures.map((f, i) => {
          const active = f.fixtureId === activeId;
          const isWC = (f.competition || "").toLowerCase().includes("world cup");
          
          return (
            <button
              key={`r-${f.fixtureId}-${i}`}
              onClick={() => onPick(f)}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 transition-all border text-left cursor-pointer ${
                active
                  ? "bg-[#d4af37]/10 border-[#d4af37]/35 shadow-[0_0_12px_rgba(212,175,55,0.08)]"
                  : "bg-black/40 border-[#3a473a]/40 hover:bg-[#3a473a]/25 hover:border-[#6b7c6b]/35"
              }`}
            >
              <img src={flagUrl(f.homeCode || f.home, 20)} alt="" width={15} height={10} className="rounded-sm object-cover border border-[#3a473a]/30 shadow-sm" loading="lazy" />
              <span className={`text-[10px] font-black tracking-widest ${active ? "text-[#d4af37]" : "text-[#d2dcd2]"}`}>
                {(f.homeCode || f.home).slice(0, 3).toUpperCase()}
              </span>
              <span className="text-[8px] text-[#6b7c6b] font-bold">vs</span>
              <span className={`text-[10px] font-black tracking-widest ${active ? "text-[#d4af37]" : "text-[#d2dcd2]"}`}>
                {(f.awayCode || f.away).slice(0, 3).toUpperCase()}
              </span>
              <img src={flagUrl(f.awayCode || f.away, 20)} alt="" width={15} height={10} className="rounded-sm object-cover border border-[#3a473a]/30 shadow-sm" loading="lazy" />
              
              {isWC && (
                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded tracking-widest leading-none ${
                  active ? "bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/20" : "bg-black/30 text-[#6b7c6b] border border-[#3a473a]/40"
                }`}>
                  WC
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
