import { NextResponse } from "next/server";
import { Keypair, Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

// On-Chain Escrow Reward claim payout endpoint
export async function POST(req: Request) {
  try {
    const { publicKey } = await req.json();
    if (!publicKey) {
      return NextResponse.json({ success: false, error: "Public key is required" }, { status: 400 });
    }

    console.log(`[txline-claim] Initializing escrow payout of 0.02 SOL to ${publicKey}...`);
    
    // Connect to official Solana devnet connection
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Generate a temporary payout vault keypair representing the escrow pool
    const tempVault = Keypair.generate();
    
    console.log(`[txline-claim] Temp Vault: ${tempVault.publicKey.toBase58()}`);
    console.log(`[txline-claim] Requesting devnet faucet funds...`);
    
    // Request airdrop of 0.04 SOL to cover transfer + rent/gas fees
    const airdropSig = await connection.requestAirdrop(
      tempVault.publicKey, 
      0.04 * 1000000000 // 0.04 SOL in lamports
    );
    
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({
      signature: airdropSig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, "confirmed");
    
    console.log(`[txline-claim] Faucet loaded. Executing payout transfer...`);

    // Build Transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: tempVault.publicKey,
        toPubkey: new PublicKey(publicKey),
        lamports: 0.02 * 1000000000, // 0.02 SOL
      })
    );
    
    // Execute and sign using the tempVault authority
    const signature = await sendAndConfirmTransaction(
      connection, 
      transaction, 
      [tempVault],
      { commitment: "confirmed" }
    );
    
    console.log(`[txline-claim] Payout Success! Tx: ${signature}`);
    
    return NextResponse.json({ 
      success: true, 
      signature,
      vault: tempVault.publicKey.toBase58()
    });

  } catch (error: any) {
    console.error(`[txline-claim] Error executing claim:`, error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Solana RPC congestion error. Please try again." 
    }, { status: 500 });
  }
}
