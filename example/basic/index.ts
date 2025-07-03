import "dotenv/config";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk";
import {
  getSPLBalance,
  printSOLBalance,
} from "../util.ts";
import fs from "fs";

console.log("========= DEMARRAGE SCRIPT =========");
console.log("[DEBUG] process.cwd():", process.cwd());
console.log("[DEBUG] PRIVATE_KEY_CREATOR =", process.env.PRIVATE_KEY_CREATOR ? "[OK]" : "[ABSENT]");
console.log("[DEBUG] HELIUS_RPC_URL =", process.env.HELIUS_RPC_URL);

const DEVNET_RPC =
  process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const SLIPPAGE_BPS = 100n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/logo.png";

// 🔐 Charge les wallets depuis les variables .env
function loadWallet(envVar: string): Keypair {
  const secret = JSON.parse(envVar);
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

const CREATOR_KEY = process.env.PRIVATE_KEY_CREATOR!;
const TREND_KEY = process.env.PRIVATE_KEY_TRENDING!;
const BUYER_KEYS = [
  process.env.PRIVATE_KEY_BUYER2!,
  process.env.PRIVATE_KEY_BUYER3!,
  process.env.PRIVATE_KEY_BUYER4!,
  process.env.PRIVATE_KEY_BUYER5!,
  process.env.PRIVATE_KEY_BUYER6!,
  process.env.PRIVATE_KEY_BUYER7!,
];

async function main() {
  console.log("[1] Connexion à Solana...");
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(loadWallet(CREATOR_KEY)), {
    commitment: "confirmed",
  });
  const sdk = new PumpFunSDK(provider);
  const mint = Keypair.generate();

  await printSOLBalance(connection, loadWallet(CREATOR_KEY).publicKey, "creator");

  // Logo
  let logoBlob = undefined;
  if (fs.existsSync(LOGO_PATH)) {
    const img = await fs.promises.readFile(LOGO_PATH);
    logoBlob = new Blob([img], { type: "image/png" });
    console.log(`✅ Logo détecté: ${LOGO_PATH}`);
  } else {
    console.log("❌ Aucun logo utilisé (mint sans image)");
  }

  const meta = {
    name: "MOON 🌕🚀",
    symbol: "MOON",
    description:
      "To the moon with $MOON 🌕🚀\nThe community-driven token that shines the brightest!\n\n📱 Website: https://moontoken.xyz\n💬 Telegram: https://t.me/moontoken\n🐦 Twitter: https://twitter.com/moontoken",
    ...(logoBlob ? { file: logoBlob } : {}),
  };

  // 1️⃣ Création + premier achat
  console.log("[2] Mint et premier achat...");
  try {
    const res = await sdk.trade.createAndBuy(
      loadWallet(CREATOR_KEY),
      mint,
      meta,
      BigInt(Math.floor(0.003 * LAMPORTS_PER_SOL)), // BUY 1
      SLIPPAGE_BPS,
      PRIORITY_FEE
    );
    if (res.success) {
      console.log("🚀 Mint OK:", `https://pump.fun/${mint.publicKey.toBase58()}?cluster=devnet`);
    } else {
      console.log("⛔ Erreur Mint + Buy:", res.error);
      return;
    }
  } catch (e) {
    console.log("[ERREUR createAndBuy]", e);
    return;
  }

  // 2️⃣ Achats par les autres wallets
  const amounts = [0.0007, 0.0002, 0.0006, 0.0003, 0.0004, 0.0005]; // En SOL
  for (let i = 0; i < BUYER_KEYS.length; i++) {
    const wallet = loadWallet(BUYER_KEYS[i]);
    try {
      await sdk.trade.buy(
        wallet,
        mint.publicKey,
        BigInt(Math.floor(amounts[i] * LAMPORTS_PER_SOL)),
        SLIPPAGE_BPS,
        PRIORITY_FEE
      );
      console.log(`✅ BUY wallet ${i + 2}: ${amounts[i]} SOL`);
    } catch (e) {
      console.log(`⛔ Erreur BUY wallet ${i + 2}:`, e);
    }
    await new Promise((r) => setTimeout(r, 500)); // petite pause entre les buys
  }

  const bal = await getSPLBalance(
    connection,
    mint.publicKey,
    loadWallet(CREATOR_KEY).publicKey
  );
  console.log("Token balance (creator):", bal);

  // 3️⃣ SELL all (du creator uniquement)
  try {
    await sdk.trade.sell(
      loadWallet(CREATOR_KEY),
      mint.publicKey,
      BigInt(Math.floor(Number(bal) * 10 ** DEFAULT_DECIMALS)),
      SLIPPAGE_BPS,
      PRIORITY_FEE
    );
    await printSOLBalance(connection, loadWallet(CREATOR_KEY).publicKey, "creator after sell");
  } catch (e) {
    console.log("[ERREUR sell]", e);
  }

  // 4️⃣ Trending buys toutes les minutes (jusqu’à 0.005 SOL cumulés)
  const trendingWallet = loadWallet(TREND_KEY);
  let trendingBuyCount = 0;
  const TRENDING_BUY_AMOUNT = 0.001;
  const TRENDING_MAX_TOTAL = 0.005;
  const TRENDING_INTERVAL = 60_000;

  const trendingInterval = setInterval(async () => {
    const totalSpent = TRENDING_BUY_AMOUNT * (trendingBuyCount + 1);
    if (totalSpent > TRENDING_MAX_TOTAL) {
      console.log("✅ Plafond des achats tendance atteint (0.005 SOL). Arrêt.");
      clearInterval(trendingInterval);
      return;
    }

    try {
      await sdk.trade.buy(
        trendingWallet,
        mint.publicKey,
        BigInt(Math.floor(TRENDING_BUY_AMOUNT * LAMPORTS_PER_SOL)),
        SLIPPAGE_BPS,
        PRIORITY_FEE
      );
      trendingBuyCount++;
      console.log(`🔥 Trending buy #${trendingBuyCount} (cumul: ${totalSpent.toFixed(3)} SOL)`);
    } catch (e) {
      console.error("❌ Trending buy error:", e);
    }
  }, TRENDING_INTERVAL);
}

main().catch(console.error);
