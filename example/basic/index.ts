import "dotenv/config";
import fs from "fs";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../util.ts";

const RPC_URL = process.env.HELIUS_RPC_URL!;
const SLIPPAGE_BPS = 300n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };

const LOGO_PATH = "./example/basic/sui.png";
const TOKEN_NAME = "$CHE";
const TOKEN_SYMBOL = "CHE";
const TOKEN_DESC = `Switzerland joins the Memecup! 🇨🇭⛰️  
Precision, neutrality, and meme-finance excellence.  
Can $CHE scale the peaks and become a vault of value? 🧀🔒  
Wave the red flag with pride, and let the Alps echo with pumps!  
🏆 https://memecup.ovh  
💬 Telegram: https://t.me/memecup44  
🔗 X: https://x.com/memecupofficial`;

const BUY_AMOUNT_SOL = 0.4;

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

async function main() {
  console.log("========= DEMARRAGE SCRIPT CHE (CREATOR ONLY) =========");
  const connection = new Connection(RPC_URL, "confirmed");

  const creator = loadWallet("PRIVATE_KEY_CREATOR", "creator");
  if (!creator) {
    console.error("❌ Wallet creator invalide. Arrêt.");
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
  const firstBuyLamports = BigInt(Math.floor(BUY_AMOUNT_SOL * LAMPORTS_PER_SOL));
  console.log("[2] Lancement du mint...");
  const res = await sdk.trade.createAndBuy(creator, mint, meta, firstBuyLamports, SLIPPAGE_BPS, PRIORITY_FEE);

  if (!res.success) {
    console.error("⛔ Mint échoué:", res.error);
    return;
  }

  console.log("🚀 Mint + Buy OK:", `https://pump.fun/${mint.publicKey.toBase58()}`);
  const bal = await getSPLBalance(connection, mint.publicKey, creator.publicKey);
  console.log("🎯 Balance tokens (creator):", bal);
}

main().catch(console.error);
