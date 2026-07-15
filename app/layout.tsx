import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "@/utils/WalletContextProvider";

export const metadata: Metadata = {
  title: "StreakLINE – World Cup Hi-Lo Stats",
  description: "Guess Higher or Lower on live World Cup stats. Powered by TxLINE real-time data. Build your streak across 104 matches.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}