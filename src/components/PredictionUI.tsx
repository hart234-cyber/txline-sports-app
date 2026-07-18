"use client";

import { StatKey } from "@/lib/txline-client";

export function PredictionUI({
  result,
  guess,
  streak,
  resultValue,
  nextValue,
  statKey,
  lastValue,
  statUnit,
  onGuess,
  onNext,
  hoveredGuess,
  setHoveredGuess,
  showProofPanel,
  onToggleProof,
}: {
  result: "win" | "lose" | "push" | null;
  guess: "hi" | "lo" | null;
  streak: number;
  resultValue: number | null;
  nextValue: number | null;
  statKey: StatKey;
  lastValue: number;
  statUnit: string;
  onGuess: (dir: "hi" | "lo") => void;
  onNext: () => void;
  hoveredGuess: "hi" | "lo" | null;
  setHoveredGuess: (g: "hi" | "lo" | null) => void;
  showProofPanel: boolean;
  onToggleProof: () => void;
}) {
  const diff = nextValue !== null ? nextValue - lastValue : null;
  return (
    <div>
      {/* Action Buttons */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3.5">
        <button
          onMouseEnter={() => !guess && setHoveredGuess("lo")}
          onMouseLeave={() => setHoveredGuess(null)}
          onClick={() => onGuess("lo")}
          disabled={!!guess}
          className={`h-14 rounded-2xl font-black text-[12px] tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer ${
            guess === "lo"
              ? "bg-[#ff2255] text-white border-transparent shadow-[0_0_15px_rgba(255,34,85,0.25)]"
              : "bg-black/40 hover:bg-[#ff2255]/10 text-[#d2dcd2] border border-[#ff2255]/20 hover:border-[#ff2255]/40"
          } disabled:opacity-50`}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="text-base">↓</span> LOWER
          </span>
        </button>
        <button
          onMouseEnter={() => !guess && setHoveredGuess("hi")}
          onMouseLeave={() => setHoveredGuess(null)}
          onClick={() => onGuess("hi")}
          disabled={!!guess}
          className={`h-14 rounded-2xl font-black text-[12px] tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer ${
            guess === "hi"
              ? "bg-[#00ff88] text-black border-transparent shadow-[0_0_15px_rgba(0,255,136,0.25)]"
              : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-transparent shadow-[0_0_15px_rgba(0,240,255,0.15)]"
          } disabled:opacity-50`}
        >
          <span className="flex items-center justify-center gap-2">
            HIGHER <span className="text-base">↑</span>
          </span>
        </button>
      </div>

      {/* Prediction Results Banner + Merkle Toggle */}
      {result && (
        <div className="mx-4 mb-4 space-y-2 anim-pop">
          <div className={`rounded-2xl px-4 py-4 flex items-center justify-between border ${
            result === "win" ? "bg-[#00ff88]/5 border-[#00ff88]/20" : result === "lose" ? "bg-[#ff2255]/5 border-[#ff2255]/20" : "bg-black/40 border-[#3a473a]/40"
          }`}>
            <div>
              <div className={`text-[12px] font-black uppercase tracking-wider ${
                result === "win" ? "text-[#00ff88]" : result === "lose" ? "text-[#ff2255]" : "text-[#d2dcd2]"
              }`}>
                {result === "win" ? `Correct! Streak Match ${streak}` : result === "lose" ? "Prediction Error — Streak Reset" : "Match Push — Streak Maintained"}
              </div>
              {result === "win" && streak >= 3 && (
                <span className="text-[8px] text-[#00ff88]/70 font-bold uppercase tracking-[0.18em] block mt-1">
                  {streak >= 10 ? "LEGENDARY RUN" : streak >= 7 ? "STREAK MASTER" : "HEAT RISING"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onToggleProof}
                className="text-[9px] font-black tracking-widest uppercase px-4 py-2.5 rounded-xl border border-[#00f0ff]/35 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] transition-all cursor-pointer">
                Verify Proof
              </button>
              <button onClick={onNext}
                className="text-[9px] font-black tracking-widest uppercase px-5 py-2.5 rounded-xl bg-[#3a473a]/40 hover:bg-[#3a473a]/80 text-[#f4f6f4] border border-[#3a473a]/60 transition-all cursor-pointer">
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
