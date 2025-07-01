import { Keypair, Connection, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import dotenv from "dotenv";
dotenv.config();

const connection = new Connection(process.env.HELIUS_RPC_URL!, "confirmed");
const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const payer = Keypair.fromSecretKey(secretKey);

(async () => {
  try {
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      9
    );
    console.log("✅ Mint SPL créé avec succès :", mint.toBase58());
  } catch (err) {
    console.error("❌ Mint SPL échoué :", err);
  }
})();
