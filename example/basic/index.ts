import "dotenv/config";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-repumped-sdk";
import { getSPLBalance, printSOLBalance } from "../../utils.js";
import fs from "fs";

// --------- CONFIG ---------
const DEVNET_RPC = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const SLIPPAGE_BPS = 100n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };
const LOGO_PATH = "./example/basic/logo.png"; // Ajoute ce fichier ou retire file: du metadata

const secret = JSON.parse(process.env.PRIVATE_KEY!);
const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));

// --------- MAIN ---------
async function main() {
  console.log("========= DEMARRAGE SCRIPT PUMP.FUN =========");
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });
  const sdk = new PumpFunSDK(provider);
  const mint = Keypair.generate(); // Nouveau mint

  await printSOLBalance(connection, wallet.publicKey, "Ton wallet");

  // --------- Mint + Buy ----------
  let metadata: any = {
    name: "MYTOKEN",
    symbol: "MTK",
    description: "A demo token.",
  };
  if (fs.existsSync(LOGO_PATH)) {
    const img = fs.readFileSync(LOGO_PATH);
    metadata.file = new Blob([img], { type: "image/png" });
    console.log("✅ Image détectée, ajoutée au mint !");
  } else {
    console.log("⚠️  Pas d'image trouvée, mint sans logo.");
  }

  try {
    console.log("⏳ Mint du token...");
    await sdk.trade.createAndBuy(
      wallet,
      mint,
      metadata,
      0.0001 * LAMPORTS_PER_SOL,
      SLIPPAGE_BPS,
      PRIORITY_FEE
    );
    console.log("🚀 Mint + buy réussi ! Lien Pump.fun :", `https://pump.fun/${mint.publicKey.toBase58()}`);
  } catch (e) {
    console.error("Erreur pendant le mint :", e);
  }

  // --------- Solde Token ---------
  const bal = await getSPLBalance(connection, mint.publicKey, wallet.publicKey);
  console.log("Solde token après buy :", bal);

  await printSOLBalance(connection, wallet.publicKey, "Ton wallet après mint+buy");
}

main().catch(console.error);
