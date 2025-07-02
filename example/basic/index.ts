import "dotenv/config";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../util.ts";
import fs from "fs";

console.log("========= DEMARRAGE SCRIPT =========");
console.log("[DEBUG] process.cwd():", process.cwd());
console.log("[DEBUG] PRIVATE_KEY =", process.env.PRIVATE_KEY ? "[OK]" : "[ABSENT]");
console.log("[DEBUG] HELIUS_RPC_URL =", process.env.HELIUS_RPC_URL);

const DEVNET_RPC = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const SLIPPAGE_BPS = 100n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/logo.png"; // ou "./example/basic/random.png"

const secret = JSON.parse(process.env.PRIVATE_KEY!);
const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));

async function main() {
  console.log("[1] Connexion à Solana...");
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: "confirmed" });
  const sdk = new PumpFunSDK(provider);
  const mint = Keypair.generate();

  await printSOLBalance(connection, wallet.publicKey, "user");

  // 1️⃣ create + first buy
  let logoBlob = undefined;
  if (fs.existsSync(LOGO_PATH)) {
    const img = await fs.promises.readFile(LOGO_PATH);
    logoBlob = new Blob([img], { type: "image/png" });
    console.log(`✅ Logo détecté: ${LOGO_PATH}`);
  } else {
    console.log("❌ Aucun logo utilisé (mint sans image)");
  }

  const meta = {
    name: "DEV-TEST",
    symbol: "DVT",
    description: "Devnet demo",
    ...(logoBlob ? { file: logoBlob } : {}),
  };

  console.log("[2] Lancement du mint...");
  try {
    const res = await sdk.trade.createAndBuy(
      wallet,
      mint,
      meta,
      BigInt(Math.floor(0.0001 * LAMPORTS_PER_SOL)), // CORRIGÉ
      SLIPPAGE_BPS,
      PRIORITY_FEE
    );
    if (res.success) {
      console.log("🚀 Mint + buy OK:", `https://pump.fun/${mint.publicKey.toBase58()}?cluster=devnet`);
    } else {
      console.log("⛔ Erreur Mint + Buy:", res.error);
      return;
    }
  } catch (e) {
    console.log("[ERREUR createAndBuy]", e);
    return;
  }

  // 2️⃣ second buy
  try {
    await sdk.trade.buy(
      wallet,
      mint.publicKey,
      BigInt(Math.floor(0.0002 * LAMPORTS_PER_SOL)), // CORRIGÉ
      SLIPPAGE_BPS,
      PRIORITY_FEE
    );
  } catch (e) {
    console.log("[ERREUR buy]", e);
  }
  const bal = await getSPLBalance(connection, mint.publicKey, wallet.publicKey);
  console.log("Token balance:", bal);

  // 3️⃣ sell all
  try {
    await sdk.trade.sell(
      wallet,
      mint.publicKey,
      BigInt(Math.floor(Number(bal) * 10 ** DEFAULT_DECIMALS)), // CORRIGÉ
      SLIPPAGE_BPS,
      PRIORITY_FEE
    );
    await printSOLBalance(connection, wallet.publicKey, "user after sell");
  } catch (e) {
    console.log("[ERREUR sell]", e);
  }
}

main().catch(console.error);
