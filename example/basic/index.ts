import "dotenv/config";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../util.ts";
import fs from "fs";

const DEVNET_RPC = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const SLIPPAGE_BPS = 100n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/logo.png"; // ou "./example/basic/random.png"

const secret = JSON.parse(process.env.PRIVATE_KEY!);
const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));

async function printSOL(conn: Connection, pk: PublicKey, label = "") {
  const sol = (await conn.getBalance(pk)) / LAMPORTS_PER_SOL;
  console.log(`${label} SOL:`, sol.toFixed(4));
}

async function main() {
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

  const res = await sdk.trade.createAndBuy(
    wallet,
    mint,
    meta,
    0.0001 * LAMPORTS_PER_SOL,
    SLIPPAGE_BPS,
    PRIORITY_FEE
  );
  if (res.success) {
    console.log("🚀 Mint + buy OK:", `https://pump.fun/${mint.publicKey.toBase58()}?cluster=devnet`);
  } else {
    console.log("⛔ Erreur Mint + Buy:", res.error);
    return;
  }

  // 2️⃣ second buy
  await sdk.trade.buy(
    wallet,
    mint.publicKey,
    0.0002 * LAMPORTS_PER_SOL,
    SLIPPAGE_BPS,
    PRIORITY_FEE
  );
  const bal = await getSPLBalance(connection, mint.publicKey, wallet.publicKey);
  console.log("Token balance:", bal);

  // 3️⃣ sell all
  await sdk.trade.sell(
    wallet,
    mint.publicKey,
    BigInt(bal * 10 ** DEFAULT_DECIMALS),
    SLIPPAGE_BPS,
    PRIORITY_FEE
  );
  await printSOLBalance(connection, wallet.publicKey, "user after sell");
}

main().catch(console.error);
