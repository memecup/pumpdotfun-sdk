import "dotenv/config";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../util.ts";
import fs from "fs";

console.log("========= DEMARRAGE SCRIPT =========");
console.log("[DEBUG] process.cwd():", process.cwd());
console.log("[DEBUG] HELIUS_RPC_URL =", process.env.HELIUS_RPC_URL);

const DEVNET_RPC = process.env.HELIUS_RPC_URL!;
const SLIPPAGE_BPS = 100n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/logo.png";

// 🔐 Fonction de chargement d’un wallet avec log d’erreur s’il est malformé
function loadWallet(envVarName: string): Keypair {
  try {
    const secretRaw = process.env[envVarName];
    if (!secretRaw) throw new Error("Variable manquante");

    const secret = JSON.parse(secretRaw);
    if (!Array.isArray(secret) || secret.length !== 64) {
      throw new Error(`Clé invalide (longueur = ${secret.length})`);
    }

    return Keypair.fromSecretKey(Uint8Array.from(secret));
  } catch (e: any) {
    console.error(`❌ Erreur avec ${envVarName}: ${e.message}`);
    throw e;
  }
}

// 🧠 Chargement des wallets
const walletCreator = loadWallet("PRIVATE_KEY_CREATOR");

async function main() {
  console.log("[1] Connexion à Solana...");
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(walletCreator), { commitment: "confirmed" });
  const sdk = new PumpFunSDK(provider);
  const mint = Keypair.generate();

  await printSOLBalance(connection, walletCreator.publicKey, "creator");

  // MINT
  let logoBlob = undefined;
  if (fs.existsSync(LOGO_PATH)) {
    const img = await fs.promises.readFile(LOGO_PATH);
    logoBlob = new Blob([img], { type: "image/png" });
    console.log(`✅ Logo détecté: ${LOGO_PATH}`);
  } else {
    console.log("❌ Aucun logo utilisé (mint sans image)");
  }

  const meta = {
    name: "MOON",
    symbol: "MOON",
    description: "To the 🌕 with $MOON! Let’s fly past the stars. 🚀✨\n\n",
    ...(logoBlob ? { file: logoBlob } : {}),
  };

  console.log("[2] Lancement du mint...");
  try {
    const res = await sdk.trade.createAndBuy(
      walletCreator,
      mint,
      meta,
      BigInt(Math.floor(0.003 * LAMPORTS_PER_SOL)),
      SLIPPAGE_BPS,
      PRIORITY_FEE
    );

    if (!res.success) {
      console.error("⛔ Échec mint+buy:", res.error);
      return;
    }

    console.log("🚀 Mint + Buy OK:", `https://pump.fun/${mint.publicKey.toBase58()}`);
  } catch (e) {
    console.error("[ERREUR MINT+BUY]", e);
    return;
  }

  // VERIF BALANCE
  const bal = await getSPLBalance(connection, mint.publicKey, walletCreator.publicKey);
  console.log("🎯 Balance tokens (creator):", bal);

  // SELL (optionnel, ici on revend tout juste après)
  try {
    await sdk.trade.sell(
      walletCreator,
      mint.publicKey,
      BigInt(Math.floor(Number(bal) * 10 ** DEFAULT_DECIMALS)),
      SLIPPAGE_BPS,
      PRIORITY_FEE
    );
    await printSOLBalance(connection, walletCreator.publicKey, "creator after sell");
  } catch (e) {
    console.error("[ERREUR SELL]", e);
  }
}

main().catch(console.error);
