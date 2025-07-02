import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWalletImport from "@coral-xyz/anchor/dist/cjs/nodewallet.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();
const NodeWallet = NodeWalletImport.default || NodeWalletImport;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLIPPAGE_BASIS_POINTS = 100n;
const LOGO_PATH = join(__dirname, "logo.png"); // Mets ici le nom de ton image si besoin

const getProvider = () => {
  if (!process.env.HELIUS_RPC_URL) throw new Error("Please set HELIUS_RPC_URL in .env file");
  const connection = new Connection(process.env.HELIUS_RPC_URL, "finalized");
  const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
  const keypair = Keypair.fromSecretKey(secretKey);
  const wallet = new NodeWallet(keypair);
  console.log(">>> Adresse Solana (PRIVATE_KEY utilisée) :", keypair.publicKey.toBase58());
  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

const createAndBuyToken = async (sdk, payer, mint) => {
  // Construire metadata avec ou sans image
  let tokenMetadata = {
    name: "TST-7",
    symbol: "TST-7",
    description: "TST-7: This is a test token",
  } as any;
  if (fs.existsSync(LOGO_PATH)) {
    tokenMetadata.filePath = LOGO_PATH;
    console.log("✅ Image trouvée :", LOGO_PATH, "(ajoutée au mint)");
  } else {
    console.log("⚠️ Pas d'image, le token sera mint SANS image !");
  }

  try {
    console.log("⏳ Mint du token...");
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
    if (res.success) {
      console.log("🚀 Mint + buy réussi ! Lien Pump.fun :", `https://pump.fun/${mint.publicKey.toBase58()}`);
    } else {
      console.error("Erreur durant le mint :", res.error || res);
    }
  } catch (e) {
    console.error("Erreur pendant le mint :", e.message || e);
  }
};

const main = async () => {
  console.log("========= DEMARRAGE SCRIPT PUMP.FUN =========");
  try {
    const provider = getProvider();
    const sdk = new PumpFunSDK(provider);
    const connection = provider.connection;
    const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
    const payer = Keypair.fromSecretKey(secretKey);
    const mint = Keypair.generate();

    const sol = await connection.getBalance(payer.publicKey);
    console.log(`[MAIN] Ton wallet ${payer.publicKey.toBase58()}: ${sol / LAMPORTS_PER_SOL} SOL`);
    if (sol === 0) {
      console.log("Please send some SOL to le wallet:", payer.publicKey.toBase58());
      return;
    }

    const globalAccount = await sdk.getGlobalAccount();
    console.log("[MAIN] GlobalAccount:", globalAccount);

    await createAndBuyToken(sdk, payer, mint);
  } catch (error) {
    console.error("An error occurred:", error);
  }
  console.log("========= [MAIN] Fin script ===========");
};

main();
