"use client";

import React, { FC, ReactNode, useMemo, useEffect, useState } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css";

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  // Helius devnet RPC — best compatibility with @solana/web3.js 1.98+
  // Ankr caused StructError on getAccountInfo; official devnet RPC drops txs
  const endpoint = useMemo(() => "https://api.devnet.solana.com", []);
  const wallets = useMemo(() => [], []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};