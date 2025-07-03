import "dotenv/config";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../util.ts";
import fs from "fs";

console.log("========= DEMARRAGE SCRIPT =========");
console.log("[DEBUG] process.cwd():", process.cwd());
console.log("[DEBUG] PRIVATE_KEY_CREATOR =", process.env.PRIVATE_KEY_CREATOR ? "[OK]" : "[ABSENT]");
console.log("[DEBUG] HELIUS_RPC_URL =", process.env.HELIUS_RPC_URL);

const DEVNET_RPC = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const SLIPPAGE_BPS = 100n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/logo.png";

function loadWallet(envVar: string): Keypair {
  const key = JSON.parse(process.env[envVar]!);
  return Keypair.fromSecretKey(Uint8Array.from(key));
}

const wallets: { name: string; keypair: Keypair; amount: number }[] = [
  { name: "CREATOR", keypair: loadWallet("PRIVATE_KEY_CREATOR"), amount: 0.003 },
  { name: "BUYER2", keypair: loadWallet("PRIVATE_KEY_BUYER2"), amount: 0.0007 },
  { name: "BUYER3", keypair: loadWallet("PRIVATE_KEY_BUYER3"), amount: 0.0002 },
  { name: "BUYER4", keypair: loadWallet("PRIVATE_KEY_BUYER4"), amount: 0.0006 },
  { name: "BUYER5", keypair: loadWallet("PRIVATE_KEY_BUYER5"), amount: 0.0004 },
  { name: "BUYER6", keypair: loadWallet("PRIVATE_KEY_BUYER6"), amount: 0.0003 },
  { name: "BUYER7", keypair: loadWallet("PRIVATE_KEY_BUYER7"), amount: 0.0002 },
];

const trendWallet = loadWallet("PRIVATE_KEY_TRENDING");

async function main() {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const mint = Keypair.generate();
  const creator = wallets[0];
  const provider = new AnchorProvider(connection, new Wallet(creator.keypair), { commitment: "confirmed" });
  const sdk = new PumpFunSDK(provider);

  const sol = await connection.getBalance(creator.keypair.publicKey);
  const solAmount = sol / LAMPORTS_PER_SOL;
  if (solAmount < 0.1) {
    console.log("❌ Le wallet créateur n'a pas assez de SOL.");
    return;
  }

  await printSOLBalance(connection, creator.keypair.publicKey, "Wallet Créateur");

  let logoBlob;
  if (fs.existsSync(LOGO_PATH)) {
    const img = await fs.promises.readFile(LOGO_PATH);
    logoBlob = new Blob([img], { type: "image/png" });
    console.log(`✅ Logo détecté: ${LOGO_PATH}`);
  }

  const meta = {
    name: "MOON 🌕🚀",
    symbol: "MOON",
    description:
      `Le token qui vise la Lune 🌕🚀\n\n🔥 100% décentralisé\n🌍 Propulsé par la communauté\n🚨 Aucune taxe\n\nWebsite: https://moontoken.xyz\n💬 Telegram: https://t.me/moontoken\n🐦 Twitter: https://twitter.com/moontoken`,
    ...(logoBlob ? { file: logoBlob } : {}),
  };

  console.log("[1] Mint + premier buy (creator)...");
  const res = await sdk.trade.createAndBuy(
    creator.keypair,
    mint,
    meta,
    BigInt(Math.floor(creator.amount * LAMPORTS_PER_SOL)),
    SLIPPAGE_BPS,
    PRIORITY_FEE
  );
  if (!res.success) return console.log("⛔ Erreur Mint:", res.error);
  console.log("✅ Mint OK:", `https://pump.fun/${mint.publicKey.toBase58()}?cluster=devnet`);

  for (let i = 1; i < wallets.length; i++) {
    const w = wallets[i];
    try {
      console.log(`👉 [${w.name}] buy ${w.amount} SOL...`);
      await sdk.trade.buy(
        w.keypair,
        mint.publicKey,
        BigInt(Math.floor(w.amount * LAMPORTS_PER_SOL)),
        SLIPPAGE_BPS,
        PRIORITY_FEE
      );
    } catch (e) {
      console.log(`[ERREUR buy ${w.name}]`, e);
    }
  }

  // Trending bot every minute (ex: 0.001 SOL max)
  setInterval(async () => {
    try {
      await sdk.trade.buy(
        trendWallet,
        mint.publicKey,
        BigInt(Math.floor(0.001 * LAMPORTS_PER_SOL)),
        SLIPPAGE_BPS,
        PRIORITY_FEE
      );
      console.log("🔥 Trending buy (0.001 SOL)");
    } catch (e) {
      console.log("[ERREUR trending buy]", e);
    }
  }, 60_000);

  const bal = await getSPLBalance(connection, mint.publicKey, creator.keypair.publicKey);
  console.log("Token balance:", bal);
}

main().catch(console.error);
