"use client";

import { useEffect, useState } from "react";
import { fetchFixtures, flagUrl, type Fixture } from "@/lib/txline-client";

function fmtTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " — " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function MatchSchedule({ onPickId }: { onPickId: (id: number) => void }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFixtures().then(({ fixtures }) => {
      setFixtures(fixtures);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl glass-panel p-16 text-center border-[#d4af37]/10 bg-black/40">
        <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-[10px] font-black tracking-widest text-[#6b7c6b] uppercase">Syncing Schedule Feeds...</span>
      </div>
    );
  }

  const wc = fixtures.filter(f => (f.competition || "").toLowerCase().includes("world cup"));
  const fr = fixtures.filter(f => !(f.competition || "").toLowerCase().includes("world cup"));

  const Row = ({ f }: { f: Fixture }) => {
    const live = f.status === "LIVE" || f.status === "1H" || f.status === "2H" || f.status === "HT";
    return (
      <button
        onClick={() => onPickId(f.fixtureId)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all group bg-black/25 border border-[#3a473a]/40 hover:border-[#d4af37]/25 hover:bg-[#d4af37]/4 active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Home team */}
          <div className="flex items-center gap-3 min-w-[120px]">
            <img src={flagUrl(f.homeCode || f.home, 20)} alt="" width={18} height={12} className="rounded-sm object-cover shadow border border-[#3a473a]/40" />
            <span className="text-[12px] font-black text-[#d2dcd2] group-hover:text-white transition-colors truncate">{f.home}</span>
          </div>

          {/* VS or Score */}
          <div className="flex-1 flex justify-center">
            {live ? (
              <div className="flex items-center gap-2 bg-[#00ff88]/10 px-3 py-1 rounded-full border border-[#00ff88]/20 shrink-0 shadow-[0_0_10px_rgba(0,255,136,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-[10px] font-black text-[#00ff88] tabular-nums tracking-wide">{f.homeScore ?? 0} - {f.awayScore ?? 0}</span>
              </div>
            ) : (
              <span className="text-[9px] text-[#6b7c6b] font-black tracking-widest uppercase">VS</span>
            )}
          </div>

          {/* Away team */}
          <div className="flex items-center gap-3 min-w-[120px] justify-end">
            <span className="text-[12px] font-black text-[#d2dcd2] group-hover:text-white transition-colors truncate text-right">{f.away}</span>
            <img src={flagUrl(f.awayCode || f.away, 20)} alt="" width={18} height={12} className="rounded-sm object-cover shadow border border-[#3a473a]/40" />
          </div>
        </div>

        {/* Time Status / Arrow */}
        <div className="ml-5 flex items-center gap-3 shrink-0">
          {live ? (
            <span className="text-[8.5px] font-black text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded tracking-widest uppercase border border-[#00ff88]/15">
              {f.minute ? `${f.minute}'` : "LIVE"}
            </span>
          ) : (
            <span className="text-[9px] text-[#6b7c6b] font-mono font-bold tracking-tight">
              {(f as any).startTime ? fmtTime((f as any).startTime) : "SCHEDULED"}
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="text-[#3a473a] group-hover:text-[#d4af37] transition-all group-hover:translate-x-0.5"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-black text-[#f4f6f4] uppercase tracking-widest">Match Schedule</h2>
        <span className="text-[9px] font-mono text-[#6b7c6b] tracking-wider uppercase">{fixtures.length} Active Feeds</span>
      </div>

      {wc.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden bg-black/50 border-[#d4af37]/10">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#3a473a]/30 bg-black/20">
            <span className="text-[9px] font-black tracking-[0.25em] text-[#d4af37] uppercase">World Cup 2026</span>
            <span className="text-[9px] font-bold text-[#6b7c6b] font-mono">{wc.length} Matches</span>
          </div>
          <div className="p-3 space-y-2">{wc.map((f, i) => <Row key={`w-${f.fixtureId}-${i}`} f={f} />)}</div>
        </div>
      )}

      {fr.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden bg-black/50 border-[#d4af37]/10">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#3a473a]/30 bg-black/20">
            <span className="text-[9px] font-black tracking-[0.25em] text-[#6b7c6b] uppercase">Warmup Friendlies</span>
            <span className="text-[9px] font-bold text-[#6b7c6b] font-mono">{fr.length} Matches</span>
          </div>
          <div className="p-3 space-y-2">{fr.map((f, i) => <Row key={`f-${f.fixtureId}-${i}`} f={f} />)}</div>
        </div>
      )}

      <p className="text-[8px] text-[#6b7c6b] text-center tracking-[0.18em] uppercase">Tap any console match ticket to load active feed</p>
    </div>
  );
}
