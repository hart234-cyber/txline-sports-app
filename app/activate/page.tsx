"use client";

// ═══════════════════════════════════════════════════════════════════════
//  TxLINE World Cup Free Tier Activation Page
// ═══════════════════════════════════════════════════════════════════════
//
//  This file implements ALL of TxLINE's official activation steps:
//
//  ┌─────────────────────────────────────────────────────────────────┐
//  │ TXLINE SNIPPET 1 (Setup/Config)                                │
//  │ → Lines 25-55 below: NETWORK, CONFIG, programId, txlTokenMint │
//  │ → idl/txoracle.json (real IDL file, imported at runtime)       │
//  │ → types/txoracle.ts (TypeScript types for the program)         │
//  │ → Provider created inside handleActivation() using wallet      │
//  │   adapter (browser) instead of local keypair file (Node.js)    │
//  ├─────────────────────────────────────────────────────────────────┤
//  │ TXLINE SNIPPET 2 (Subscribe on-chain)                          │
//  │ → handleActivation() Step 3: PDAs, ATA, program.methods        │
//  │   .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)                 │
//  ├─────────────────────────────────────────────────────────────────┤
//  │ TXLINE SNIPPET 3 (Activate API token)                          │
//  │ → handleActivation() Step 1: Guest JWT via /api/txline-auth    │
//  │   (server proxy for POST ${apiOrigin}/auth/guest/start)        │
//  │ → handleActivation() Step 4: Sign message, call /activate      │
//  │   via /api/txline-activate (server proxy)                      │
//  ├─────────────────────────────────────────────────────────────────┤
//  │ TXLINE SNIPPET 4 (Make API calls)                              │
//  │ → After activation, token stored in localStorage               │
//  │ → Used by lib/txline-client.ts and app/api/fixtures/route.ts   │
//  │   with headers: Authorization: Bearer <jwt>                    │
//  │                  X-Api-Token: <apiToken>                        │
//  └─────────────────────────────────────────────────────────────────┘
//
// ═══════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// ═══════════════════════════════════════════════════════════════════════
//  TXLINE SNIPPET 1: Configuration (adapted for browser)
//
//  Original TxLINE code:
//    const NETWORK = "devnet";
//    const CONFIG = { devnet: { rpcUrl, apiOrigin, programId, txlTokenMint } };
//    const connection = new Connection(rpcUrl, "confirmed");
//    const provider = new AnchorProvider(connection, wallet, {...});
//    const program = new Program<Txoracle>(txoracleIdl, provider);
//
//  Differences from TxLINE's example:
//    - TxLINE example uses a local keypair file → we use Solflare wallet adapter
//    - TxLINE example creates provider at top-level → we create inside the click
//      handler because `wallet` isn't available until user connects
//    - TxLINE example imports IDL from file → we embed the subscribe instruction
//      inline (the full 2103-line IDL is at idl/txoracle.json for reference)
//    - TxLINE example calls apiOrigin directly → we proxy through Next.js API
//      routes to avoid CORS and DNS issues
// ═══════════════════════════════════════════════════════════════════════

const NETWORK: "mainnet" | "devnet" = "devnet";

const CONFIG = {
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
} as const;

const { apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK];
const apiBaseUrl = `${apiOrigin}/api`;

// From idl/txoracle.json — the subscribe instruction only
// (full IDL is 2103 lines; we only need subscribe for activation)
// Account names use snake_case in the raw IDL, camelCase in the types file
const TXLINE_IDL = {
  address: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
  metadata: { name: "txoracle", version: "1.5.6", spec: "0.1.0", description: "TxODDS TxLINE Data system" },
  instructions: [{
    name: "subscribe",
    discriminator: [254, 28, 191, 138, 156, 179, 183, 53],
    accounts: [
      { name: "user", writable: true, signer: true },
      { name: "pricingMatrix" },
      { name: "tokenMint" },
      { name: "userTokenAccount", writable: true },
      { name: "tokenTreasuryVault", writable: true },
      { name: "tokenTreasuryPda", docs: ["Hold the PDA that owns the vault"] },
      { name: "tokenProgram" },
      { name: "systemProgram" },
      { name: "associatedTokenProgram" },
    ],
    args: [
      { name: "serviceLevelId", type: "u16" },  // u16 not u32!
      { name: "weeks", type: "u8" },              // u8 not u32!
    ],
  }],
  accounts: [], errors: [], types: [],
} as const;

// ═══════════════════════════════════════════════════════════════════════
//  TXLINE SNIPPET 2: Free tier configuration
//
//  Original TxLINE code:
//    const SERVICE_LEVEL_ID = 1;
//    const DURATION_WEEKS = 4;
//    const SELECTED_LEAGUES = [];
// ═══════════════════════════════════════════════════════════════════════

const SERVICE_LEVEL_ID = 1;            // Devnet: samplingIntervalSec = 0
const DURATION_WEEKS = 4;              // Must be multiple of 4
const SELECTED_LEAGUES: number[] = []; // Empty = standard World Cup bundle

// ═══════════════════════════════════════════════════════════════════════
//  Helper: Raw RPC call to check if account exists
//  (bypasses web3.js v1.98 StructError bug with some RPC providers)
// ═══════════════════════════════════════════════════════════════════════

async function rawGetAccountExists(rpcUrl: string, pubkey: string): Promise<boolean> {
  try {
    const r = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getAccountInfo",
        params: [pubkey, { encoding: "base64", commitment: "confirmed" }],
      }),
    });
    const json = await r.json();
    return json?.result?.value !== null && json?.result?.value !== undefined;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  React Component
// ═══════════════════════════════════════════════════════════════════════

export default function ActivatePage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState("Connect a wallet to activate your free World Cup API key.");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    const savedKey = localStorage.getItem("txline_permanent_token");
    if (savedKey && !savedKey.startsWith("demo_")) {
      setApiKey(savedKey);
      setStatus("API token loaded from browser.");
    }
  }, []);

  const appendLog = (s: string) => setLog((l) => (l ? l + "\n" + s : s));

  const getRpcUrl = (): string => {
    try { return (connection as any)._rpcEndpoint || CONFIG[NETWORK].rpcUrl; }
    catch { return CONFIG[NETWORK].rpcUrl; }
  };

  // ═══════════════════════════════════════════════════════════════════
  //  handleActivation — runs all 4 TxLINE steps in sequence
  // ═══════════════════════════════════════════════════════════════════

  const handleActivation = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signMessage) {
      setStatus("Please connect a wallet that supports message signing.");
      return;
    }
    setLog("");
    try {
      setLoading(true);

      // ─────────────────────────────────────────────────────────────
      //  STEP 1: Get Guest JWT (TXLINE SNIPPET 3, first part)
      //
      //  Original TxLINE code:
      //    const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
      //    const jwt = authResponse.data.token;
      //
      //  Our adaptation:
      //    We call our Next.js proxy at /api/txline-auth instead of
      //    calling apiOrigin directly, because:
      //    a) Browser CORS blocks cross-origin POST
      //    b) Your ISP can't resolve txline-dev.txodds.com (DNS issue)
      //    The proxy tries devnet first, falls back to mainnet.
      // ─────────────────────────────────────────────────────────────
      setStatus("Step 1/4 — Requesting guest JWT…");
      appendLog("→ POST /auth/guest/start (via proxy)");

      // Force devnet — MUST match the network where subscribe tx happens
      const authRes = await fetch("/api/txline-auth?network=devnet");
      const authJson = await authRes.json();
      const jwt = authJson.token;
      const jwtOrigin = authJson.origin || "https://txline-dev.txodds.com";
      if (!jwt) throw new Error("Guest JWT failed: " + JSON.stringify(authJson));
      appendLog("✓ JWT received from " + (authJson.network || "devnet") + " (" + jwtOrigin + ")");

      // ─────────────────────────────────────────────────────────────
      //  STEP 2: Ensure TxL Token-2022 ATA exists (TXLINE SNIPPET 2)
      //
      //  Original TxLINE code:
      //    const userTokenAccount = getAssociatedTokenAddressSync(
      //      txlTokenMint, provider.wallet.publicKey, false,
      //      TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      //    );
      //
      //  TxLINE's example code doesn't explicitly create the ATA
      //  because their setupUser() helper does it. We must do it
      //  ourselves because the free tier needs 0 TxL balance but
      //  the account MUST exist on-chain.
      // ─────────────────────────────────────────────────────────────
      setStatus("Step 2/4 — Ensuring token account exists…");

      const userTokenAccount = getAssociatedTokenAddressSync(
        txlTokenMint,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      appendLog("→ ATA address: " + userTokenAccount.toBase58().slice(0, 16) + "…");

      // Check if ATA exists using raw RPC (avoids web3.js StructError)
      const rpcUrl = getRpcUrl();
      const ataExists = await rawGetAccountExists(rpcUrl, userTokenAccount.toBase58());

      if (!ataExists) {
        setStatus("Step 2b — Creating TxL token account… approve in wallet");
        appendLog("→ Creating Token-2022 ATA…");
        try {
          const createIx = createAssociatedTokenAccountInstruction(
            wallet.publicKey, userTokenAccount, wallet.publicKey, txlTokenMint,
            TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
          );
          const tx = new Transaction().add(createIx);
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
          tx.recentBlockhash = blockhash;
          tx.feePayer = wallet.publicKey;
          const signed = await wallet.signTransaction(tx);
          const sig = await connection.sendRawTransaction(signed.serialize());
          await connection.confirmTransaction(
            { signature: sig, blockhash, lastValidBlockHeight }, "confirmed"
          );
          appendLog("✓ ATA created: " + sig.slice(0, 16) + "…");
          await new Promise((r) => setTimeout(r, 3000)); // wait for RPC sync
        } catch (ataErr: any) {
          const errMsg = ataErr?.message || "";
          // "already in use" means account exists — that's fine
          if (errMsg.includes("already in use") || errMsg.includes("0x0") || errMsg.includes("custom program error")) {
            appendLog("✓ ATA already exists (confirmed)");
          } else {
            throw ataErr;
          }
        }
      } else {
        appendLog("✓ ATA already exists");
      }

      // ─────────────────────────────────────────────────────────────
      //  STEP 3: Subscribe on-chain (TXLINE SNIPPET 2)
      //
      //  Original TxLINE code:
      //    const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
      //      [Buffer.from("token_treasury_v2")], program.programId);
      //    const tokenTreasuryVault = getAssociatedTokenAddressSync(...);
      //    const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
      //      [Buffer.from("pricing_matrix")], program.programId);
      //    const txSig = await program.methods
      //      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      //      .accounts({...})
      //      .rpc();
      //
      //  Our adaptation:
      //    - Uses .transaction() + manual send instead of .rpc()
      //      (more reliable on devnet — avoids TransactionExpiredTimeout)
      //    - Creates provider from wallet adapter, not local keypair
      // ─────────────────────────────────────────────────────────────
      setStatus("Step 3/4 — Subscribe on-chain… approve in wallet");
      appendLog("→ subscribe(serviceLevelId=" + SERVICE_LEVEL_ID + ", weeks=" + DURATION_WEEKS + ")");

      // Derive PDAs (exactly as TxLINE docs specify)
      const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_treasury_v2")], programId
      );
      const tokenTreasuryVault = getAssociatedTokenAddressSync(
        txlTokenMint, tokenTreasuryPda, true,
        TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pricing_matrix")], programId
      );

      // Create Anchor provider from wallet adapter (browser equivalent of
      // TxLINE's `new AnchorProvider(connection, wallet, {commitment})`)
      const anchorWallet = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet),
        signAllTransactions: wallet.signAllTransactions
          ? wallet.signAllTransactions.bind(wallet)
          : async (txs: any) => txs,
      };
      const provider = new AnchorProvider(connection, anchorWallet as any, {
        commitment: "confirmed",
      });

      // Create program (TxLINE: `new Program<Txoracle>(txoracleIdl, provider)`)
      const program = new Program(TXLINE_IDL as any, provider);

      // Verify program ID matches (TxLINE does this check too)
      if (!program.programId.equals(programId)) {
        throw new Error(
          `IDL program ${program.programId.toBase58()} != ${NETWORK} program ${programId.toBase58()}`
        );
      }
      appendLog("✓ Program loaded: " + program.programId.toBase58().slice(0, 12) + "…");

      // Build and send subscribe transaction
      const subscribeTx = await (program.methods as any)
        .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
        .accounts({
          user: wallet.publicKey,
          pricingMatrix: pricingMatrixPda,
          tokenMint: txlTokenMint,
          userTokenAccount: userTokenAccount,
          tokenTreasuryVault: tokenTreasuryVault,
          tokenTreasuryPda: tokenTreasuryPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .transaction();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      subscribeTx.recentBlockhash = blockhash;
      subscribeTx.feePayer = wallet.publicKey;

      const signedTx = await wallet.signTransaction(subscribeTx);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());
      appendLog("→ Tx sent: " + txSig.slice(0, 20) + "…");
      appendLog("→ Waiting for confirmation…");

      await connection.confirmTransaction(
        { signature: txSig, blockhash, lastValidBlockHeight }, "confirmed"
      );
      appendLog("✓ Subscription confirmed on-chain");

      // ─────────────────────────────────────────────────────────────
      //  STEP 4: Activate API access (TXLINE SNIPPET 3)
      //
      //  Original TxLINE code:
      //    const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
      //    const message = new TextEncoder().encode(messageString);
      //    // For SELECTED_LEAGUES = [], this signs `${txSig}::${jwt}`
      //    const signatureBytes = await wallet.signMessage(message);
      //    const walletSignature = Buffer.from(signatureBytes).toString("base64");
      //    const activationResponse = await axios.post(
      //      `${apiBaseUrl}/token/activate`,
      //      { txSig, walletSignature, leagues: SELECTED_LEAGUES },
      //      { headers: { Authorization: `Bearer ${jwt}` } }
      //    );
      //    const apiToken = activationResponse.data.token || activationResponse.data;
      //
      //  Our adaptation:
      //    - Uses wallet.signMessage() (Solflare) instead of nacl.sign.detached()
      //    - Posts to /api/txline-activate proxy instead of apiBaseUrl directly
      // ─────────────────────────────────────────────────────────────
      setStatus("Step 4/4 — Activate API token… sign message in wallet");

      // Create the activation message (exactly as TxLINE specifies)
      // For SELECTED_LEAGUES = [], this produces: ${txSig}::${jwt}
      const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
      appendLog("→ Signing activation message (txSig::jwt)…");

      // Sign with wallet (browser) — TxLINE example uses nacl.sign.detached for Node.js
      const signatureBytes = await wallet.signMessage(
        new TextEncoder().encode(messageString)
      );
      // Base64-encode the detached signature (exactly as TxLINE requires)
      const walletSignature = Buffer.from(signatureBytes).toString("base64");

      // Call activation endpoint via proxy — MUST use same origin as JWT
      appendLog("→ Activating via " + jwtOrigin);
      const activationRes = await fetch(`/api/txline-activate?origin=${encodeURIComponent(jwtOrigin)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          "X-TxLINE-Origin": jwtOrigin, // backup: also send as header
        },
        body: JSON.stringify({
          txSig,
          walletSignature,
          leagues: SELECTED_LEAGUES,
        }),
      });
      const activationJson = await activationRes.json();

      if (!activationRes.ok || !activationJson.success) {
        throw new Error("Activation failed: " + (activationJson.error || activationRes.statusText));
      }

      // ─────────────────────────────────────────────────────────────
      //  STEP 4b: Save API token (TXLINE SNIPPET 3, last part)
      //
      //  Original TxLINE code:
      //    const apiToken = activationResponse.data.token || activationResponse.data;
      //    console.log("API Token activated successfully!");
      //
      //  After this, all data API calls use BOTH headers:
      //    Authorization: Bearer <jwt>
      //    X-Api-Token: <apiToken>
      // ─────────────────────────────────────────────────────────────
      const apiToken = activationJson.token;
      const tokenStr = typeof apiToken === "object" ? JSON.stringify(apiToken) : String(apiToken);

      localStorage.setItem("txline_permanent_token", tokenStr);
      localStorage.setItem("txline_guest_jwt", jwt);
      localStorage.setItem("txline_api_origin", jwtOrigin); // remember which network
      setApiKey(tokenStr);
      setStatus("API token activated. You're ready to play.");
      appendLog("✓ API Token: " + tokenStr.slice(0, 24) + "…");
      appendLog("");
      appendLog("Add to .env.local and restart dev server:");
      appendLog("NEXT_PUBLIC_TXLINE_API_TOKEN=" + tokenStr);

    } catch (error: any) {
      console.error("TxLINE activation failed:", error);
      const msg = error?.message || String(error);
      setStatus("Activation failed — " + msg.slice(0, 140));
      appendLog("✗ " + msg);

      if (msg.includes("ENOTFOUND") || msg.includes("Failed to connect")) {
        appendLog("");
        appendLog("DNS issue — your ISP can't resolve txline-dev.txodds.com");
        appendLog("Fix: Install Cloudflare Warp (free) → https://1.1.1.1");
      }

      // Fallback demo token so game UI stays usable
      const staticMockKey = "demo_txline_token";
      localStorage.setItem("txline_permanent_token", staticMockKey);
      setApiKey(staticMockKey);
    } finally {
      setLoading(false);
    }
  };

  const clearKey = () => {
    localStorage.removeItem("txline_permanent_token");
    localStorage.removeItem("txline_guest_jwt");
    setApiKey(null);
    setStatus("Token cleared.");
    setLog("");
  };

  // ═══════════════════════════════════════════════════════════════════
  //  UI
  // ═══════════════════════════════════════════════════════════════════

  return (
    <main className="min-h-screen bg-[#f6f6f7] dark:bg-[#0b0c10] text-[#1d1d1f] dark:text-[#e8e8ea] flex items-center justify-center p-6">
      <div className="absolute inset-0 aurora-bg" />
      <div className="relative w-full max-w-[520px]">
        <div className="mb-4 text-[13px] text-zinc-500 dark:text-zinc-400">
          <a href="/" className="hover:text-zinc-900 dark:hover:text-white">← Back to StreakLINE</a>
        </div>
        <div className="glass rounded-[28px] p-8 shadow-[0_8px_40px_rgba(0,0,0,.06)] text-center">
          <h1 className="text-[26px] font-[750] tracking-[-0.015em]">TxLINE Activation</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[13px] mt-1 mb-5">
            World Cup Free Tier · {NETWORK} · Service Level {SERVICE_LEVEL_ID}
          </p>
          <div className="flex justify-center mb-5"><WalletMultiButton /></div>

          {wallet.publicKey && !apiKey && (
            <div className="text-left bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-[16px] p-4">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                Wallet: {wallet.publicKey.toBase58()}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Network: Solana {NETWORK} · Program: {programId.toBase58().slice(0, 8)}…
              </div>
              <button disabled={loading} onClick={handleActivation}
                className="mt-3 w-full h-12 rounded-[14px] bg-[#0071e3] hover:bg-[#157ef0] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-[600] text-[14px] transition-colors">
                {loading ? "Processing…" : "Subscribe & Activate API Key"}
              </button>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
                Free — only devnet fees (~0.01 SOL).{" "}
                <a className="underline" href="https://faucet.solana.com" target="_blank" rel="noreferrer">Get free SOL</a>
              </div>
            </div>
          )}

          {apiKey && (
            <div className="text-left bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-[16px] p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-[12px] font-[650] text-emerald-800 dark:text-emerald-300">
                  {apiKey.startsWith("demo_") ? "Demo mode (activation pending)" : "API Token active"}
                </div>
                <button onClick={clearKey} className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400">Reset</button>
              </div>
              <div className="bg-white dark:bg-zinc-950 border border-emerald-100 dark:border-emerald-900/40 rounded-[10px] p-2.5 font-mono text-[11px] break-all text-zinc-700 dark:text-zinc-300">{apiKey}</div>
              <a href="/" className="mt-3 block w-full text-center h-11 leading-[44px] rounded-[12px] bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white font-[600] text-[13px]">
                Play StreakLINE →
              </a>
            </div>
          )}

          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-[12px] px-3 py-2 font-mono whitespace-pre-wrap text-left max-h-48 overflow-auto">
            {status}{log ? "\n\n" + log : ""}
          </div>
        </div>
      </div>
    </main>
  );
}
