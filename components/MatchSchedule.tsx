"use client";
import { useEffect, useState } from "react";
import { fetchFixtures, flagUrl, type Fixture } from "@/lib/txline-client";

function fmtTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+" — "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
}

export default function MatchSchedule({ onPickId }: { onPickId: (id: number) => void }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchFixtures().then(({fixtures})=>{setFixtures(fixtures);setLoading(false)}); }, []);

  if (loading) return (
    <div className="card rounded-xl p-10 text-center">
      <div className="w-6 h-6 border-2 border-[#c4a44e] border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
      <p className="text-[10px] text-[#5a5040] uppercase tracking-wider">Loading fixtures</p>
    </div>
  );

  const wc = fixtures.filter(f=>(f.competition||"").toLowerCase().includes("world cup"));
  const fr = fixtures.filter(f=>!(f.competition||"").toLowerCase().includes("world cup"));

  const Row = ({f,i}:{f:Fixture;i:number}) => {
    const live = f.status==="LIVE"||f.status==="1H"||f.status==="2H"||f.status==="HT";
    return (
      <button onClick={()=>onPickId(f.fixtureId)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all group hover:bg-[#c4a44e]/4 active:bg-[#c4a44e]/8">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-[110px]">
            <img src={flagUrl(f.homeCode||f.home,20)} alt="" width={18} height={12} className="rounded-sm object-cover shrink-0" loading="lazy"/>
            <span className="text-[12px] font-semibold text-[#d4c9b0] truncate">{f.home}</span>
          </div>
          {live ? (
            <div className="flex items-center gap-1.5 bg-[#2ecc71]/10 px-2 py-0.5 rounded border border-[#2ecc71]/12 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2ecc71] animate-pulse"/>
              <span className="text-[10px] font-bold text-[#2ecc71] tabular-nums">{f.homeScore??0}-{f.awayScore??0}</span>
            </div>
          ) : <span className="text-[10px] text-[#3a3228] shrink-0 font-semibold tracking-wider">VS</span>}
          <div className="flex items-center gap-2 min-w-[110px] justify-end">
            <span className="text-[12px] font-semibold text-[#d4c9b0] truncate text-right">{f.away}</span>
            <img src={flagUrl(f.awayCode||f.away,20)} alt="" width={18} height={12} className="rounded-sm object-cover shrink-0" loading="lazy"/>
          </div>
        </div>
        <div className="ml-3 flex items-center gap-2 shrink-0">
          {live ? <span className="text-[9px] font-bold text-[#2ecc71] bg-[#2ecc71]/10 px-2 py-0.5 rounded tracking-wider">{f.minute?`${f.minute}'`:"LIVE"}</span>
            : <span className="text-[9px] text-[#5a5040] tracking-wider">{(f as any).startTime?fmtTime((f as any).startTime):"SCHEDULED"}</span>}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="text-[#2a2420] group-hover:text-[#c4a44e] transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-bold text-[#f0ebe0] uppercase tracking-wider">Match Schedule</h2>
        <span className="text-[9px] text-[#5a5040] tracking-wider uppercase">{fixtures.length} Matches</span>
      </div>
      {wc.length>0&&(
        <div className="card rounded-xl overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center gap-3 border-b border-[#2a2420]/30">
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#c4a44e] uppercase">World Cup 2026</span>
            <div className="flex-1 h-px bg-[#2a2420]/30"/>
            <span className="text-[9px] text-[#3a3228] font-semibold">{wc.length}</span>
          </div>
          <div className="py-1">{wc.map((f,i)=><Row key={`w-${f.fixtureId}-${i}`} f={f} i={i}/>)}</div>
        </div>
      )}
      {fr.length>0&&(
        <div className="card rounded-xl overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center gap-3 border-b border-[#2a2420]/30">
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#5a5040] uppercase">Friendlies</span>
            <div className="flex-1 h-px bg-[#2a2420]/30"/>
            <span className="text-[9px] text-[#3a3228] font-semibold">{fr.length}</span>
          </div>
          <div className="py-1">{fr.map((f,i)=><Row key={`f-${f.fixtureId}-${i}`} f={f} i={i}/>)}</div>
        </div>
      )}
      <p className="text-[8px] text-[#3a3228] text-center tracking-[0.15em] uppercase">Tap any match to play — Data from TxLINE devnet</p>
    </div>
  );
}
