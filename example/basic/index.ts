import "dotenv/config";
import fs from "fs";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../util.ts";

// === CONFIG ===
const RPC_URL = process.env.HELIUS_RPC_URL!;
const SLIPPAGE_BPS = 100n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/logo.png";
const TOKEN_NAME = "MOON 🌕";
const TOKEN_SYMBOL = "MOON";
const TOKEN_DESC = `🚀 A token made to fly to the moon!  
Website: https://moontoken.xyz  
💬 Telegram: https://t.me/moontoken  
🐦 Twitter: https://twitter.com/moontoken`;

const TRENDING_INTERVAL_MS = 60_000;
const TRENDING_AMOUNT_SOL = 0.001;
const BUY_AMOUNTS_SOL = [0.003, 0.0007, 0.0002, 0.0006, 0.0004, 0.0003, 0.0005];

function loadWallet(envVar: string, label: string): Keypair {
  try {
    const raw = process.env[envVar];
    if (!raw) throw new Error("missing");
    const secret = JSON.parse(raw);
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
    console.log(`[OK] Wallet ${label}: ${keypair.publicKey.toBase58()}`);
    return keypair;
  } catch (e) {
    console.error(`[ERREUR] Chargement ${label}:`, e);
    throw e;
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("========= DEMARRAGE SCRIPT =========");
  const connection = new Connection(RPC_URL, "confirmed");

  // Load wallets
  const creator = loadWallet("PRIVATE_KEY_CREATOR", "creator");
  const trending = loadWallet("PRIVATE_KEY_TRENDING", "trending");
  const buyers = [2, 3, 4, 5, 6, 7, 8].map((i) =>
    loadWallet(`PRIVATE_KEY_BUYER${i}`, `buyer${i}`)
  );

  const provider = new AnchorProvider(connection, new Wallet(creator), {
    commitment: "confirmed",
  });
  const sdk = new PumpFunSDK(provider);

  // Display balance
  await printSOLBalance(connection, creator.publicKey, "creator");

  // Load logo
  let logoBlob = undefined;
  if (fs.existsSync(LOGO_PATH)) {
    const img = await fs.promises.readFile(LOGO_PATH);
    logoBlob = new Blob([img], { type: "image/png" });
    console.log(`✅ Logo détecté: ${LOGO_PATH}`);
  } else {
    console.log("❌ Aucun logo utilisé.");
  }

  // Metadata
  const meta = {
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    description: TOKEN_DESC,
    ...(logoBlob ? { file: logoBlob } : {}),
  };

  // Mint + Buy (wallet creator)
  const mint = Keypair.generate();
  const firstBuyLamports = BigInt(Math.floor(BUY_AMOUNTS_SOL[0] * LAMPORTS_PER_SOL));
  console.log("[2] Lancement du mint...");
  const res = await sdk.trade.createAndBuy(creator, mint, meta, firstBuyLamports, SLIPPAGE_BPS, PRIORITY_FEE);

  if (!res.success) {
    console.error("⛔ Mint échoué:", res.error);
    return;
  }

  console.log("🚀 Mint + Buy OK:", `https://pump.fun/${mint.publicKey.toBase58()}`);
  const bal = await getSPLBalance(connection, mint.publicKey, creator.publicKey);
  console.log("🎯 Balance tokens (creator):", bal);

  // Vente du wallet creator (optionnel)
  const sellAmount = BigInt(Math.floor(Number(bal) * 10 ** DEFAULT_DECIMALS));
  await sdk.trade.sell(creator, mint.publicKey, sellAmount, SLIPPAGE_BPS, PRIORITY_FEE);
  await printSOLBalance(connection, creator.publicKey, "creator after sell");

  // Sequential buys by buyer wallets
  for (let i = 0; i < buyers.length; i++) {
    const buyer = buyers[i];
    const amount = BigInt(Math.floor(BUY_AMOUNTS_SOL[i + 1] * LAMPORTS_PER_SOL));
    try {
      await sdk.trade.buy(buyer, mint.publicKey, amount, SLIPPAGE_BPS, PRIORITY_FEE);
      console.log(`💸 Buy ${i + 2} OK from ${buyer.publicKey.toBase58()}`);
    } catch (e) {
      console.error(`⛔ Buy ${i + 2} erreur:`, e);
    }
  }

  // Trending wallet (recurring buys)
  async function trendingLoop() {
    while (true) {
      const amount = Math.min(
        TRENDING_AMOUNT_SOL,
        0.005 // max cap
      );
      try {
        const lamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
        await sdk.trade.buy(trending, mint.publicKey, lamports, SLIPPAGE_BPS, PRIORITY_FEE);
        console.log(`🔥 Trending buy @${amount} SOL from ${trending.publicKey.toBase58()}`);
      } catch (e) {
        console.error("⛔ Trending buy failed:", e);
      }
      await delay(TRENDING_INTERVAL_MS);
    }
  }

  trendingLoop(); // Start the trending bot
}

main().catch(console.error);
