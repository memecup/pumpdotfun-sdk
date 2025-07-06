import "dotenv/config";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { printSOLBalance } from "../util.ts";

// === PARAMÈTRES ===
const RPC_URL = process.env.HELIUS_RPC_URL!;
const SLIPPAGE_BPS = 300n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };

const MINT_ADDRESS = "BPTvvQqtDGacQcgC2kMsBLyHAGpHtARMtmzhV3a4U4Mh"; // <- CONTRAT $USA

function loadWallet(envVar: string, label: string): Keypair | null {
  try {
    const raw = process.env[envVar];
    if (!raw) throw new Error("clé absente");
    const secret = JSON.parse(raw);
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
    console.log(`[OK] Wallet ${label}: ${keypair.publicKey.toBase58()}`);
    return keypair;
  } catch (e) {
    console.error(`[ERREUR] Wallet ${label}:`, e.message || e);
    return null;
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("========= MEMECUP TRENDING BOT =========");
  const connection = new Connection(RPC_URL, "confirmed");
  const trending = loadWallet("PRIVATE_KEY_TRENDING", "trending");

  if (!trending) {
    console.error("❌ Wallet trending invalide. Arrêt.");
    return;
  }

  const provider = new AnchorProvider(connection, new Wallet(trending), {
    commitment: "confirmed",
  });
  const sdk = new PumpFunSDK(provider);

  await printSOLBalance(connection, trending.publicKey, "trending");

  const mint = new PublicKey(MINT_ADDRESS);

  const start = Date.now();
  const end = start + 24 * 60 * 60 * 1000; // 24h

  while (Date.now() < end) {
    const elapsed = Date.now() - start;
    let interval = 180_000; // 3 min défaut
    let amount = 0.0055;

    if (elapsed < 60 * 60 * 1000) {
      interval = 30_000;
      amount = 0.01;
    } else if (elapsed < 6 * 60 * 60 * 1000) {
      interval = 90_000;
      amount = 0.0075;
    } else if (elapsed >= 18 * 60 * 60 * 1000) {
      interval = 120_000;
      amount = 0.01;
    }

    try {
      const lamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
      await sdk.trade.buy(trending, mint, lamports, SLIPPAGE_BPS, PRIORITY_FEE);
      console.log(`🔥 Trending buy @${amount} SOL from ${trending.publicKey.toBase58()}`);
    } catch (e) {
      console.error("⛔ Trending buy failed:", e.message || e);
    }
    await delay(interval);
    const h = ((Date.now() - start) / 3600000).toFixed(2);
    console.log(`⏳ Trending: ${h}h / 24h`);
  }
  console.log("⏹️ Trending terminé après 24h.");
}

main().catch(console.error);
