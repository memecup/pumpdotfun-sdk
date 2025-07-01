import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEFAULT_DECIMALS, PumpFunSDK } from "pumpdotfun-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWalletImport from "@coral-xyz/anchor/dist/cjs/nodewallet.js";
const NodeWallet = NodeWalletImport.default || NodeWalletImport;
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as fetchBlob from "fetch-blob"; // Trick pour ESM: tout importer
const { File } = fetchBlob;

import {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance
} from "../util.ts";

dotenv.config();

// Résout __dirname en mode ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_FOLDER = join(__dirname, ".keys");
const SLIPPAGE_BASIS_POINTS = 100n;

// --- Wallet depuis Railway ---
if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY manquant dans .env');
if (!process.env.HELIUS_RPC_URL) throw new Error('HELIUS_RPC_URL manquant dans .env');

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY));
const keypair = Keypair.fromSecretKey(secretKey);
console.log(">>> Adresse Solana (PRIVATE_KEY utilisée) :", keypair.publicKey.toBase58());

const getProvider = () => {
  const connection = new Connection(process.env.HELIUS_RPC_URL, "finalized");
  const wallet = new NodeWallet(keypair);
  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

const createAndBuyToken = async (sdk: PumpFunSDK, testAccount: Keypair, mint: Keypair) => {
  const tokenMetadata: any = {
    name: "TST-7",
    symbol: "TST-7",
    description: "TST-7: This is a test token",
  };
  // Gestion image optionnelle
  const imagePath = join(__dirname, "logo.png");
  if (fs.existsSync(imagePath)) {
    const fileBuffer = fs.readFileSync(imagePath);
    tokenMetadata.file = new File([fileBuffer], "logo.png", { type: "image/png" });
    console.log("✅ Image trouvée et injectée dans le mint.");
  } else {
    console.log("❌ Pas d'image trouvée, mint SANS image !");
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

    // Prends bien ton wallet Railway (PRIVATE_KEY)
    const testAccount = keypair;
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
