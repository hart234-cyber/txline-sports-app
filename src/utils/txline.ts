import { PublicKey, Connection } from "@solana/web3.js";

// 1. Core TxLINE Network Constants for Devnet
export const NETWORK = "devnet";
export const API_ORIGIN = "https://txline-dev.txodds.com";
export const API_BASE_URL = `${API_ORIGIN}/api`;

// 2. Official TxLINE Devnet Addresses
export const PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
export const TXL_TOKEN_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");

// 3. Create the Connection to Solana Devnet Blockchain
// Using official devnet RPC — Ankr causes StructError with web3.js 1.98+
export const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
export const connection = new Connection(SOLANA_RPC, "confirmed");

// 4. API Token – set TXLINE_API_TOKEN in .env.local after activating at /activate
export const API_TOKEN = process.env.TXLINE_API_TOKEN || "";

console.log("TxLINE configuration loaded:", { network: NETWORK, rpc: SOLANA_RPC, apiToken: API_TOKEN ? "present" : "missing – run /activate" });