import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet as AnchorWallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk/dist/esm/index.mjs";
import { getSPLBalance } from "pumpdotfun-repumped-sdk/dist/esm/utils.mjs";
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const SLIPPAGE_BPS = 100n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };

async function getProvider() {
  const conn = new Connection(process.env.HELIUS_RPC_URL!, "finalized");
  const secret = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
  const kp = Keypair.fromSecretKey(secret);
  console.log("🪙 Wallet :", kp.publicKey.toBase58());
  const wallet = new AnchorWallet(kp);
  return new AnchorProvider(conn, wallet, { commitment: "finalized" });
}

async function main() {
  const provider = await getProvider();
  const sdk = new PumpFunSDK(provider, { priorityFee: PRIORITY_FEE });
  const conn = provider.connection;
  const kp = (provider.wallet as AnchorWallet).payer;
  const mint = Keypair.generate();

  const solBal = await conn.getBalance(kp.publicKey);
  console.log("SOL balance:", solBal / LAMPORTS_PER_SOL);
  if (solBal < 0.0002 * LAMPORTS_PER_SOL) {
    console.error("Besoin d’au moins ~0.0002 SOL");
    return;
  }

  // Préparation du blob image
  const path = join(__dirname, "logo.png");
  const imgBuf = fs.existsSync(path) ? fs.readFileSync(path) : null;
  const blob = imgBuf ? new Blob([imgBuf], { type: "image/png" }) : undefined;

  // Création + achat
  const res = await sdk.trade.createAndBuy(
    kp,
    mint,
    { name: "MY-TST", symbol: "MTST", description: "Test", file: blob },
    BigInt(0.0001 * LAMPORTS_PER_SOL),
    SLIPPAGE_BPS,
    PRIORITY_FEE
  );
  console.log(res);
  if (!res.success) {
    console.error("Erreur:", res.error?.message || res.error);
    return;
  }

  console.log("✅ Mint + buy réussi :", `https://pump.fun/${mint.publicKey.toBase58()}`);
  const spl = await getSPLBalance(conn, mint.publicKey, kp.publicKey);
  console.log("Token balance:", spl);
}

main().catch(console.error);
