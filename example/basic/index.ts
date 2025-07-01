import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEFAULT_DECIMALS, PumpFunSDK } from "pumpdotfun-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWalletImport from "@coral-xyz/anchor/dist/cjs/nodewallet.js";
const NodeWallet = NodeWalletImport.default || NodeWalletImport;
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fetchBlob from "fetch-blob";
const File = fetchBlob.File;
import {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance
} from "../util.ts";

// Load .env
dotenv.config();

// Compatible ESM/Node
const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_FOLDER = join(__dirname, ".keys");
const SLIPPAGE_BASIS_POINTS = 100n;

// Utilisation de ton wallet Railway
const getProvider = () => {
  if (!process.env.HELIUS_RPC_URL) {
    throw new Error("Please set HELIUS_RPC_URL in .env file");
  }
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY manquant !");
  }
  const connection = new Connection(process.env.HELIUS_RPC_URL, "finalized");
  const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
  const keypair = Keypair.fromSecretKey(secretKey);
  const wallet = new NodeWallet(keypair);

  // Affiche l’adresse utilisée
  console.log(">>> Adresse Solana (PRIVATE_KEY utilisée) :", keypair.publicKey.toBase58());

  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

const createAndBuyToken = async (sdk: PumpFunSDK, testAccount: Keypair, mint: Keypair) => {
  const tokenMetadata: any = {
    name: "TST-7",
    symbol: "TST-7",
    description: "TST-7: This is a test token",
  };

  // Ajout image si dispo
  const imagePath = "example/basic/logo.png";
  if (fs.existsSync(imagePath)) {
    const fileBuffer = fs.readFileSync(imagePath);
    tokenMetadata.file = new File([fileBuffer], "logo.png", { type: "image/png" });
    console.log("✅ Image trouvée et ajoutée au mint !");
  } else {
    console.log("❌ Image non trouvée, mint SANS image.");
  }

  const createResults = await sdk.createAndBuy(
    testAccount,
    mint,
    tokenMetadata,
    BigInt(0.0001 * LAMPORTS_PER_SOL),
    SLIPPAGE_BASIS_POINTS,
    {
      unitLimit: 250000,
      unitPrice: 250000,
    }
  );

  if (createResults.success) {
    console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
    await printSPLBalance(sdk.connection, mint.publicKey, testAccount.publicKey);
  } else {
    console.log("Create and Buy failed");
    console.log(createResults);
  }
};

const buyTokens = async (sdk: PumpFunSDK, testAccount: Keypair, mint: Keypair) => {
  const buyResults = await sdk.buy(
    testAccount,
    mint.publicKey,
    BigInt(0.0001 * LAMPORTS_PER_SOL),
    SLIPPAGE_BASIS_POINTS,
    {
      unitLimit: 250000,
      unitPrice: 250000,
    }
  );

  if (buyResults.success) {
    await printSPLBalance(sdk.connection, mint.publicKey, testAccount.publicKey);
    console.log("Bonding curve after buy", await sdk.getBondingCurveAccount(mint.publicKey));
  } else {
    console.log("Buy failed");
  }
};

const sellTokens = async (sdk: PumpFunSDK, testAccount: Keypair, mint: Keypair) => {
  const currentSPLBalance = await getSPLBalance(
    sdk.connection,
    mint.publicKey,
    testAccount.publicKey
  );
  console.log("currentSPLBalance", currentSPLBalance);

  if (currentSPLBalance) {
    const sellResults = await sdk.sell(
      testAccount,
      mint.publicKey,
      BigInt(currentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)),
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 250000,
        unitPrice: 250000,
      }
    );

    if (sellResults.success) {
      await printSOLBalance(sdk.connection, testAccount.publicKey, "Test Account keypair");
      await printSPLBalance(sdk.connection, mint.publicKey, testAccount.publicKey, "After SPL sell all");
      console.log("Bonding curve after sell", await sdk.getBondingCurveAccount(mint.publicKey));
    } else {
      console.log("Sell failed");
    }
  }
};

const main = async () => {
  try {
    const provider = getProvider();
    const sdk = new PumpFunSDK(provider);
    const connection = provider.connection;

    const testAccount = getOrCreateKeypair(KEYS_FOLDER, "test-account");
    const mint = getOrCreateKeypair(KEYS_FOLDER, "mint");

    await printSOLBalance(connection, testAccount.publicKey, "Ton wallet");

    const globalAccount = await sdk.getGlobalAccount();
    console.log(globalAccount);

    const currentSolBalance = await connection.getBalance(testAccount.publicKey);
    if (currentSolBalance === 0) {
      console.log("Please send some SOL to le wallet:", testAccount.publicKey.toBase58());
      return;
    }

    let bondingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    if (!bondingCurveAccount) {
      await createAndBuyToken(sdk, testAccount, mint);
      bondingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    }

    if (bondingCurveAccount) {
      await buyTokens(sdk, testAccount, mint);
      await sellTokens(sdk, testAccount, mint);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

main();
