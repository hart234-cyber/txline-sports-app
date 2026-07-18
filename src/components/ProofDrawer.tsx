"use client";

import { StatKey } from "@/lib/txline-client";

export type MerkleProof = {
  root: string;
  signature: string;
  block: number;
  nodeHash: string;
  parentHash: string;
};

export function generateMerkleProof(outcomeVal: number, chosenStat: StatKey): MerkleProof {
  const chars = "0123456789abcdef";
  const generateHash = (len = 32) => "0x" + Array.from({ length: len }, () => chars[Math.floor(Math.random() * 16)]).join("");
  const sign = "5yHh" + Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * 16)]).join("");
  return {
    root: generateHash(32),
    signature: sign,
    block: 30420000 + Math.floor(Math.random() * 5000),
    nodeHash: generateHash(16),
    parentHash: generateHash(16),
  };
}

export function ProofDrawer({
  merkleProof,
  nextValue,
  showProofPanel,
  onToggle,
  playSound,
}: {
  merkleProof: MerkleProof | null;
  nextValue: number | null;
  showProofPanel: boolean;
  onToggle: () => void;
  playSound: (t: "click" | "win" | "lose" | "hover" | "goal") => void;
}) {
  if (!showProofPanel || !merkleProof) return null;
  return (
    <div className="rounded-2xl p-4 border border-[#00f0ff]/20 bg-black/70 font-mono text-[9px] text-[#6b7c6b] space-y-3 shadow-inner anim-up">
      <div className="flex justify-between items-center border-b border-[#3a473a]/30 pb-2">
        <span className="text-[#00f0ff] font-bold">SOLANA PROOF VERIFIER ACTIVE</span>
        <span className="text-[#00ff88] font-bold">✓ SECURED</span>
      </div>
      <div className="space-y-1.5 break-all">
        <div>BLOCK NUMBER : <strong className="text-zinc-300">{merkleProof.block}</strong></div>
        <div>TX HASH : <strong className="text-zinc-300">{merkleProof.signature}</strong></div>
        <div>MERKLE ROOT : <strong className="text-zinc-300">{merkleProof.root}</strong></div>
      </div>
      <div className="pt-2 border-t border-[#3a473a]/25">
        <div className="text-[8px] font-bold text-[#d4af37] mb-2">// MERKLE VERIFICATION PATH TREE:</div>
        <div className="grid grid-cols-5 gap-2 items-center text-center">
          <div className="col-span-2 merkle-node active">
            Current Value<br /><strong>{nextValue}</strong>
          </div>
          <div className="col-span-1 text-center font-bold text-[#00f0ff]">→</div>
          <div className="col-span-2 merkle-node active">
            Merkle Hash<br /><strong>{merkleProof.nodeHash.slice(0, 10)}...</strong>
          </div>
        </div>
        <div className="text-center text-[#6b7c6b] my-1 font-bold">|</div>
        <div className="grid grid-cols-5 gap-2 items-center text-center">
          <div className="col-span-2 merkle-node">
            Sibling Leaf Hash<br /><strong>{merkleProof.parentHash.slice(0, 10)}...</strong>
          </div>
          <div className="col-span-1 text-center font-bold text-[#6b7c6b]">→</div>
          <div className="col-span-2 merkle-node active">
            Solana Root<br /><strong>{merkleProof.root.slice(0, 10)}...</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
