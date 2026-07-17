import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "@/utils/WalletContextProvider";

export const metadata: Metadata = {
  title: "StreakLINE – World Cup 2026 Hi-Lo Prediction Game",
  description: "Guess Higher or Lower on live World Cup 2026 stats. Powered by TxLINE real-time data. Build your streak across 104 matches. Solana-powered.",
  keywords: "World Cup 2026, FIFA, TxLINE, sports betting, prediction game, Solana, blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#080c11] text-white overflow-hidden">
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
