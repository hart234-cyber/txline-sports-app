"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchFixtures, flagUrl, type Fixture } from "@/lib/txline-client";

export default function MultiMatchPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [source, setSource] = useState("demo");

  useEffect(() => {
    fetchFixtures().then(({ fixtures, source }) => {
      setFixtures(fixtures);
      setSource(source);
    });
  }, []);

  const liveFixtures = fixtures.filter(
    f => f.status === "LIVE" || f.status === "1H" || f.status === "2H" || f.status === "HT"
  );
  const upcomingFixtures = fixtures.filter(
    f => f.status === "Scheduled" || f.status === "NS"
  );

  return (
    <main className="min-h-screen bg-[#04060a] text-white p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-black uppercase tracking-tight">Multi-Match View</h1>
            <p className="text-[11px] text-[#6b7c6b] font-mono mt-1">Live fixtures side-by-side · Source: {source}</p>
          </div>
          <Link href="/dashboard" className="text-[10px] font-black tracking-widest uppercase text-[#e8c84a] hover:text-white transition-colors border border-[#e8c84a]/20 px-4 py-2 rounded-xl">
            ← Dashboard
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Live fixtures column */}
          <section className="glass rounded-3xl p-6 border border-[#ff3355]/10">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-[#ff3355] animate-pulse" />
              <h2 className="text-[14px] font-black uppercase tracking-wider text-[#ff3355]">Live Matches</h2>
            </div>
            <div className="space-y-3">
              {liveFixtures.length === 0 && (
                <div className="text-[11px] text-[#3d4f6a] font-mono">No live fixtures at this time.</div>
              )}
              {liveFixtures.map((f) => (
                <a key={f.fixtureId} href={`/dashboard?fixture=${f.fixtureId}`} className="block rounded-2xl bg-[#0f140f]/40 border border-[#3a473a]/30 hover:border-[#ff3355]/30 p-4 transition-all hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black tracking-[0.2em] text-[#ff3355] uppercase">{f.status} · {f.minute || 0}&apos;</span>
                    <span className="text-[9px] text-[#6b7c6b] font-mono">{f.competition}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={flagUrl(f.homeCode || f.home, 40)} alt={f.home} width={28} height={18} className="rounded object-cover opacity-80" />
                    <span className="text-[13px] font-black text-white truncate">{f.home}</span>
                    <span className="text-[10px] font-black text-[#8899bb]">vs</span>
                    <span className="text-[13px] font-black text-white truncate text-right flex-1">{f.away}</span>
                    <img src={flagUrl(f.awayCode || f.away, 40)} alt={f.away} width={28} height={18} className="rounded object-cover opacity-80" />
                  </div>
                  <div className="text-[20px] font-black tabular-nums text-white mt-2 tracking-tight">
                    {f.homeScore ?? 0} <span className="text-[#e8c84a]/60 mx-1">:</span> {f.awayScore ?? 0}
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Upcoming fixtures column */}
          <section className="glass rounded-3xl p-6 border border-[#e8c84a]/10">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-[#e8c84a]" />
              <h2 className="text-[14px] font-black uppercase tracking-wider text-[#e8c84a]">Upcoming</h2>
            </div>
            <div className="space-y-3">
              {upcomingFixtures.length === 0 && (
                <div className="text-[11px] text-[#3d4f6a] font-mono">No upcoming fixtures.</div>
              )}
              {upcomingFixtures.map((f) => (
                <a key={f.fixtureId} href={`/dashboard?fixture=${f.fixtureId}`} className="block rounded-2xl bg-[#0f140f]/40 border border-[#3a473a]/30 hover:border-[#e8c84a]/20 p-4 transition-all hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black tracking-[0.2em] text-[#e8c84a] uppercase">{f.status}</span>
                    <span className="text-[9px] text-[#6b7c6b] font-mono">{new Date(f.startTime || 0).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={flagUrl(f.homeCode || f.home, 40)} alt={f.home} width={28} height={18} className="rounded object-cover opacity-80" />
                    <span className="text-[13px] font-black text-white truncate">{f.home}</span>
                    <span className="text-[10px] font-black text-[#8899bb]">vs</span>
                    <span className="text-[13px] font-black text-white truncate text-right flex-1">{f.away}</span>
                    <img src={flagUrl(f.awayCode || f.away, 40)} alt={f.away} width={28} height={18} className="rounded object-cover opacity-80" />
                  </div>
                  <div className="text-[9px] text-[#3d4f6a] mt-2 font-mono">{f.venue}</div>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
