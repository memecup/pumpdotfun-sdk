
import "dotenv/config";
import fs from "fs";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../util.ts";

const RPC_URL = process.env.HELIUS_RPC_URL!;
const SLIPPAGE_BPS = 300n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/cn.png";
const TOKEN_NAME = "$CHN";
const TOKEN_SYMBOL = "CHN";
const TOKEN_DESC = `China awakens for Memecup!
🐉 The dragon stirs — can $CHN seize the lead with relentless energy?
Discipline. Speed. Power. Let’s show the world how it’s done!
Unite your friends, ignite the charts.
🏆 https://memecup.ovh
💬 Telegram: https://t.me/memecup44
🔗 X: https://x.com/memecupofficial`;

const TRENDING_INTERVAL_MS = 60_000;
const TRENDING_AMOUNT_SOL = 0.005;
const MAX_TRENDING_SOL = 0.005;
const MAX_TRENDING_MINUTES = 0;
const BUY_AMOUNTS_SOL = [0.3, 0.14, 0.125, 0.115, 0.11, 0.105, 0.105];

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
  console.log("========= DEMARRAGE SCRIPT =========");
  const connection = new Connection(RPC_URL, "confirmed");

  const creator = loadWallet("PRIVATE_KEY_CREATOR", "creator");
  const trending = loadWallet("PRIVATE_KEY_TRENDING", "trending");
  const buyers = [2, 3, 4, 5, 6, 7]
    .map((i) => loadWallet(`PRIVATE_KEY_BUYER${i}`, `buyer${i}`))
    .filter(Boolean) as Keypair[];

  if (!creator || !trending) {
    console.error("❌ Wallet creator ou trending invalide. Arrêt.");
    return;
  }

  const provider = new AnchorProvider(connection, new Wallet(creator), {
    commitment: "confirmed",
  });
  const sdk = new PumpFunSDK(provider);

  await printSOLBalance(connection, creator.publicKey, "creator");

  let logoBlob = undefined;
  if (fs.existsSync(LOGO_PATH)) {
    const img = await fs.promises.readFile(LOGO_PATH);
    logoBlob = new Blob([img], { type: "image/png" });
    console.log(`✅ Logo détecté: ${LOGO_PATH}`);
  } else {
    console.log("❌ Aucun logo utilisé.");
  }

  const meta = {
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    description: TOKEN_DESC,
    ...(logoBlob ? { file: logoBlob } : {}),
  };

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

  for (let i = 0; i < buyers.length; i++) {
    const buyer = buyers[i];
    const amount = BigInt(Math.floor(BUY_AMOUNTS_SOL[i + 1] * LAMPORTS_PER_SOL));
    try {
      await sdk.trade.buy(buyer, mint.publicKey, amount, SLIPPAGE_BPS, PRIORITY_FEE);
      console.log(`💸 Buy ${i + 2} OK from ${buyer.publicKey.toBase58()}`);
    } catch (e) {
      console.error(`⛔ Buy ${i + 2} erreur:", e.message || e);
    }
  }

  async function trendingLoop() {
    const start = Date.now();
    const durationMs = MAX_TRENDING_MINUTES * 60_000;
    while (Date.now() - start < durationMs) {
      const amount = Math.min(TRENDING_AMOUNT_SOL, MAX_TRENDING_SOL);
      try {
        const lamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
        await sdk.trade.buy(trending, mint.publicKey, lamports, SLIPPAGE_BPS, PRIORITY_FEE);
        console.log(`🔥 Trending buy @${amount} SOL from ${trending.publicKey.toBase58()}`);
      } catch (e) {
        console.error("⛔ Trending buy failed:", e.message || e);
      }
      await delay(TRENDING_INTERVAL_MS);
    }
    console.log(`⏹️ Trending terminé après ${MAX_TRENDING_MINUTES} minute(s).`);
  }

  await trendingLoop();
}

main().catch(console.error);
