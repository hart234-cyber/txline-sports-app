"use client";
import { flagUrl, type Fixture } from "@/lib/txline-client";

export default function MatchRail({ fixtures, activeId, onPick }: {
  fixtures: Fixture[]; activeId?: number; onPick: (f: Fixture) => void;
}) {
  if (!fixtures.length) return null;
  return (
    <div className="w-full overflow-x-auto hide-sb">
      <div className="flex gap-2 pb-1 min-w-max">
        {fixtures.map((f, i) => {
          const active = f.fixtureId === activeId;
          const isWC = (f.competition || "").toLowerCase().includes("world cup");
          return (
            <button key={`r-${f.fixtureId}-${i}`} onClick={() => onPick(f)}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all border text-left ${
                active
                  ? "bg-[#c4a44e]/8 border-[#c4a44e]/15"
                  : "bg-[#1a1610]/60 border-[#2a2420]/30 hover:bg-[#c4a44e]/4 hover:border-[#2a2420]/50"
              }`}>
              <img src={flagUrl(f.homeCode||f.home,20)} alt="" width={14} height={10} className="rounded-sm object-cover" loading="lazy"/>
              <span className="text-[9px] font-semibold text-[#8a7e6e] tracking-wider">{(f.homeCode||f.home).slice(0,3).toUpperCase()}</span>
              <span className="text-[8px] text-[#3a3228]">v</span>
              <span className="text-[9px] font-semibold text-[#8a7e6e] tracking-wider">{(f.awayCode||f.away).slice(0,3).toUpperCase()}</span>
              <img src={flagUrl(f.awayCode||f.away,20)} alt="" width={14} height={10} className="rounded-sm object-cover" loading="lazy"/>
              {isWC && <span className="text-[7px] font-bold text-[#c4a44e]/40 tracking-wider">WC</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
