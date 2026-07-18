"use client";

import { useRef } from "react";

export function useSoundEngine(isMuted: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: "win" | "lose" | "click" | "hover" | "goal") => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === "win") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.50, now + 0.24);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (type === "lose") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(196.00, now);
        osc.frequency.linearRampToValueAtTime(110.00, now + 0.35);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(987.77, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === "hover") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === "goal") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(440.00, now);
        osc.frequency.linearRampToValueAtTime(880.00, now + 0.25);
        osc.frequency.linearRampToValueAtTime(440.00, now + 0.5);
        osc.frequency.linearRampToValueAtTime(880.00, now + 0.75);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc.start(now);
        osc.stop(now + 1.1);
      }
    } catch (e) {
      console.error("Sound error:", e);
    }
  };

  return { playSound };
}
