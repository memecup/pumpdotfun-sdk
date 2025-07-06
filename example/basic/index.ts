import "dotenv/config";
import fs from "fs";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../util.ts";

const RPC_URL = process.env.HELIUS_RPC_URL!;
const SLIPPAGE_BPS = 300n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/us.png";
const TOKEN_NAME = "$USA";
const TOKEN_SYMBOL = "USA";
const TOKEN_DESC = `USA storms into the Memecup! 🇺🇸  
🗽 Land of boldness, memes, moonshots, and liberty.  
🚀 Can $USA lead the charge and dominate the podium?  
Let’s rally the eagles, bring the energy, and light up the charts.  
🌎 United for the win, together to the top!
🏆 https://memecup.ovh
💬 Telegram: https://t.me/memecup44
🔗 X: https://x.com/memecupofficial`;

const BUY_AMOUNTS_SOL = [2, 1.14, 1.125, 1.115, 1.11, 1.105, 1.105];

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
  console.log("========= DEMARRAGE SCRIPT USA =========");
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
      console.error(`⛔ Buy ${i + 2} erreur:`, e.message || e);
    }
    await delay(150); // Delay important pour ne pas faire tous les achats en même milliseconde
  }

  // ====== TRENDING LOOP ACTIVÉE ======
  async function trendingLoop() {
    const start = Date.now();
    const durationMs = 60 * 60 * 1000; // Ex : trending pendant 1h (change comme tu veux)
    while (Date.now() - start < durationMs) {
      const amount = 0.005; // Tu peux modifier ici la dose pour le trending
      try {
        const lamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
        await sdk.trade.buy(trending, mint.publicKey, lamports, SLIPPAGE_BPS, PRIORITY_FEE);
        console.log(`🔥 Trending buy @${amount} SOL from ${trending.publicKey.toBase58()}`);
      } catch (e) {
        console.error("⛔ Trending buy failed:", e.message || e);
      }
      await delay(90_000); // 1 trending toutes les 1min30 (ajuste si besoin)
    }
    console.log(`⏹️ Trending terminé après 1h.`);
  }

  await trendingLoop();
}

main().catch(console.error);
