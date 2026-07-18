"use client";

import React from "react";

export type SwipeHandlers = {
  onTS: (e: React.TouchEvent) => void;
  onTM: (e: React.TouchEvent) => void;
  onTE: () => void;
  swipeOffset: number;
  swipeDirection: "hi" | "lo" | null;
  hoveredGuess: "hi" | "lo" | null;
  setHoveredGuess: (g: "hi" | "lo" | null) => void;
  guess: "hi" | "lo" | null;
};

export function SwipeControls({
  children,
  swipeProps,
}: {
  children: React.ReactNode;
  swipeProps: SwipeHandlers;
}) {
  return (
    <div
      onTouchStart={swipeProps.onTS}
      onTouchMove={swipeProps.onTM}
      onTouchEnd={swipeProps.onTE}
      className="relative"
    >
      {children}
      {swipeProps.swipeOffset > 0 && (
        <div
          className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#00ff88]/10 to-transparent pointer-events-none transition-opacity"
          style={{ opacity: Math.min(1, swipeProps.swipeOffset / 100) }}
        />
      )}
      {swipeProps.swipeOffset < 0 && (
        <div
          className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#ff2255]/10 to-transparent pointer-events-none transition-opacity"
          style={{ opacity: Math.min(1, Math.abs(swipeProps.swipeOffset) / 100) }}
        />
      )}
    </div>
  );
}
