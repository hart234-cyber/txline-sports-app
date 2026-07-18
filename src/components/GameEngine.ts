"use client";

import { useState, useCallback } from "react";
import { STATS, getReplayValue, type Fixture, type StatKey } from "@/lib/txline-client";
import { getPunditTake, type PunditTake } from "@/lib/ai-pundit";

type Round = {
  fixture: Fixture;
  statKey: StatKey;
  statLabel: string;
  unit: string;
  lastValue: number;
  step: number;
};

export function useGameEngine(fixture: Fixture | null, externalFixtureId?: number | null) {
  const [round, setRound] = useState<Round | null>(null);
  const [guess, setGuess] = useState<"hi" | "lo" | null>(null);
  const [hoveredGuess, setHoveredGuess] = useState<"hi" | "lo" | null>(null);
  const [nextValue, setNextValue] = useState<number | null>(null);
  const [result, setResult] = useState<"win" | "lose" | "push" | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [pundit, setPundit] = useState<PunditTake | null>(null);

  const newRound = useCallback((f: Fixture | null = fixture) => {
    if (!f) return;
    const stat = STATS[Math.floor(Math.random() * STATS.length)];
    const step = 3 + Math.floor(Math.random() * 5);
    const initialVal = getReplayValue(stat.key, step);
    setRound({ fixture: f, statKey: stat.key, statLabel: stat.label, unit: stat.unit, lastValue: initialVal, step });
    setGuess(null);
    setNextValue(null);
    setResult(null);
    setHoveredGuess(null);
    setPundit(getPunditTake(stat.key, initialVal, f.homeCode, f.awayCode, f.minute));
  }, [fixture]);

  const resolveRound = useCallback((userGuess: "hi" | "lo", resolvedVal: number) => {
    if (!round) return;
    let res: "win" | "lose" | "push" = "push";
    if (resolvedVal > round.lastValue) res = userGuess === "hi" ? "win" : "lose";
    else if (resolvedVal < round.lastValue) res = userGuess === "lo" ? "win" : "lose";

    setResult(res);
    if (res === "win") {
      const ns = streak + 1;
      setStreak(ns);
      localStorage.setItem("streakline_current", String(ns));
      if (ns > best) {
        setBest(ns);
        localStorage.setItem("streakline_best", String(ns));
      }
    } else if (res === "lose") {
      setStreak(0);
      localStorage.setItem("streakline_current", "0");
    }
  }, [round, streak, best]);

  return {
    round,
    guess,
    hoveredGuess,
    nextValue,
    result,
    streak,
    best,
    pundit,
    setGuess,
    setHoveredGuess,
    setNextValue,
    setResult,
    newRound,
    resolveRound,
    setStreak,
    setBest,
  };
}
