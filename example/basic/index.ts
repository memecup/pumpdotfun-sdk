import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWalletImport from "@coral-xyz/anchor/dist/cjs/nodewallet.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { File } from "fetch-blob/file.js";

// =========== LOG DEMARRAGE ==============
console.log("========= DEMARRAGE SCRIPT PUMP.FUN =========");

// Config .env et NodeWallet
dotenv.config();
const NodeWallet = NodeWalletImport.default || NodeWalletImport;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLIPPAGE_BASIS_POINTS = 100n;

// ================= PROVIDER =================
const getProvider = () => {
  console.log("[1] Appel getProvider");
  if (!process.env.HELIUS_RPC_URL) {
    throw new Error("Please set HELIUS_RPC_URL in .env file");
  }
  const connection = new Connection(process.env.HELIUS_RPC_URL, "finalized");
  const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
  const keypair = Keypair.fromSecretKey(secretKey);
  const wallet = new NodeWallet(keypair);
  console.log(">>> Adresse Solana (PRIVATE_KEY utilisée) :", keypair.publicKey.toBase58());
  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

// Patch globalThis
if (typeof globalThis.File === "undefined") {
  console.log("[2] Patch globalThis.File");
  globalThis.File = File;
} else {
  console.log("[2] globalThis.File existant");
}

// ============ MINT + BUY =============
const createAndBuyToken = async (sdk, payer, mint) => {
  console.log("[3] createAndBuyToken: Début");

  // Utilise un fake mini PNG, évite File must be Blob error
  const fakeLogo = new File(
    [Uint8Array.from([
      0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
      0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,
      0x89,0x00,0x00,0x00,0x0a,0x49,0x44,0x41,0x54,0x78,0x9c,0x63,0x00,0x01,0x00,0x00,
      0x05,0x00,0x01,0x0d,0x0a,0x2d,0xb4,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,
      0x42,0x60,0x82
    ])],
    "logo.png",
    { type: "image/png" }
  );

  const tokenMetadata = {
    name: "TST-7",
    symbol: "TST-7",
    description: "TST-7: This is a test token",
    file: fakeLogo
  };

  try {
    console.log("[4] ⏳ Mint du token...");
    const res = await sdk.createAndBuy(
      payer,
      mint,
      tokenMetadata,
      BigInt(0.0001 * LAMPORTS_PER_SOL),
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 250000,
        unitPrice: 250000,
      }
    );
    console.log("[5] Résultat retour createAndBuy:", res);

    if (res.success) {
      console.log("🚀 Mint + buy réussi ! Lien Pump.fun :", `https://pump.fun/${mint.publicKey.toBase58()}`);
      return;
    } else {
      if (
        res.error &&
        (res.error.message?.includes("ConstraintSeeds") || res.error.message?.includes("0x7d6"))
      ) {
        console.warn("Mint ok mais buy trop tôt ! On va réessayer jusqu'à succès...");
        // (autoRetryBuy...)
      } else {
        console.error("Erreur inattendue dans le flow :", res.error || res);
      }
    }
  } catch (e) {
    console.error("Erreur pendant le mint :", e.message || e);
  }
};

// =========== MAIN =============
const main = async () => {
  console.log("========= [MAIN] Début script ============");
  try {
    const provider = getProvider();
    console.log("[MAIN] Provider prêt");
    const sdk = new PumpFunSDK(provider);
    const connection = provider.connection;
    const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
    const payer = Keypair.fromSecretKey(secretKey);
    const mint = Keypair.generate();

    // Affiche solde du wallet principal
    const sol = await connection.getBalance(payer.publicKey);
    console.log(`[MAIN] Ton wallet ${payer.publicKey.toBase58()}: ${sol / LAMPORTS_PER_SOL} SOL`);
    if (sol === 0) {
      console.log("[MAIN] Please send some SOL to le wallet:", payer.publicKey.toBase58());
      return;
    }

    const globalAccount = await sdk.getGlobalAccount();
    console.log("[MAIN] GlobalAccount:", globalAccount);

    await createAndBuyToken(sdk, payer, mint);

    console.log("========= [MAIN] Fin script ============");
  } catch (error) {
    console.error("[MAIN] An error occurred:", error);
  }
};

main();
