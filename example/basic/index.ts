import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEFAULT_DECIMALS, PumpFunSDK } from "pumpdotfun-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWalletImport from "@coral-xyz/anchor/dist/cjs/nodewallet.js";
const NodeWallet = NodeWalletImport.default || NodeWalletImport;
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Pour l'image
import fetchblobModule from "fetch-blob/from.js";
const Blob = fetchblobModule.Blob;

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLIPPAGE_BASIS_POINTS = 100n;
const LOGO_PATH = join(__dirname, "logo.png");

const getProvider = () => {
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

const createAndBuyToken = async (sdk: PumpFunSDK, payer: Keypair, mint: Keypair) => {
  let logoFile;
  if (fs.existsSync(LOGO_PATH)) {
    const buffer = fs.readFileSync(LOGO_PATH);
    logoFile = new Blob([buffer], { type: "image/png" });
    console.log("✅ Logo.png chargé pour le mint !");
  } else {
    console.warn("❌ Aucun logo trouvé, le mint sera sans image !");
  }

  const tokenMetadata: any = {
    name: "TST-7",
    symbol: "TST-7",
    description: "TST-7: This is a test token",
  };
  if (logoFile) tokenMetadata.file = logoFile;

  // Mint puis auto-retry sur buy
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
      return;
    } else {
      // Si le buy rate à cause de l'indexation Pump.fun
      if (
        res.error &&
        (res.error.message?.includes("ConstraintSeeds") || res.error.message?.includes("0x7d6"))
      ) {
        console.warn("Mint ok mais buy trop tôt ! On va réessayer jusqu'à succès...");
        await autoRetryBuy(sdk, payer, mint);
      } else {
        console.error("Erreur inattendue dans le flow :", res.error || res);
      }
    }
  } catch (e: any) {
    console.error("Erreur pendant le mint :", e.message || e);
  }
};

const autoRetryBuy = async (sdk: PumpFunSDK, payer: Keypair, mint: Keypair) => {
  let bought = false;
  let tryCount = 0;
  while (!bought && tryCount < 15) {
    tryCount++;
    console.log(`⏳ [Retry #${tryCount}] Tentative de buy...`);
    await new Promise(res => setTimeout(res, 12000)); // 12 secondes
    try {
      const buyRes = await sdk.buy(
        payer,
        mint.publicKey,
        BigInt(0.0001 * LAMPORTS_PER_SOL),
        SLIPPAGE_BASIS_POINTS,
        {
          unitLimit: 250000,
          unitPrice: 250000,
        }
      );
      if (buyRes.success) {
        bought = true;
        console.log("✅ Buy réussi après retry !", buyRes);
        console.log("Lien Pump.fun :", `https://pump.fun/${mint.publicKey.toBase58()}`);
        break;
      } else {
        console.log("Buy failed, retrying...", buyRes.error || buyRes);
      }
    } catch (e) {
      console.log("Buy error, retrying...", e);
    }
  }
  if (!bought) {
    console.warn("⚠️ Impossible de buy après 15 tentatives. Attends que Pump.fun indexe le token et relance !");
  }
};

const main = async () => {
  try {
    const provider = getProvider();
    const sdk = new PumpFunSDK(provider);
    const connection = provider.connection;
    const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
    const payer = Keypair.fromSecretKey(secretKey);
    const mint = Keypair.generate();

    // Affiche solde du wallet principal
    const sol = await connection.getBalance(payer.publicKey);
    console.log(`Ton wallet ${payer.publicKey.toBase58()}: ${sol / LAMPORTS_PER_SOL} SOL`);
    if (sol === 0) {
      console.log("Please send some SOL to le wallet:", payer.publicKey.toBase58());
      return;
    }

    const globalAccount = await sdk.getGlobalAccount();
    console.log(globalAccount);

    await createAndBuyToken(sdk, payer, mint);
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

main();
