import { PublicKey, Connection } from "@solana/web3.js";

// 1. Core TxLINE Network Constants for Devnet
export const NETWORK = "devnet";
export const API_ORIGIN = "https://txline-dev.txodds.com";
export const API_BASE_URL = `${API_ORIGIN}/api`;

// 2. Official TxLINE Devnet Addresses
export const PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
export const TXL_TOKEN_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");

// 3. Create the Connection to Solana Devnet Blockchain
export const connection = new Connection("https://api.devnet.solana.com", "confirmed");

console.log("TxLINE configuration file loaded successfully for:", NETWORK);