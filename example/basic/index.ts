import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEFAULT_DECIMALS, PumpFunSDK } from "pumpdotfun-sdk";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
} from "../util.ts"; // Chemin correct si util.ts est dans example/

dotenv.config();

// Correction pour __dirname en module ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KEYS_FOLDER = join(__dirname, "../.keys");
const SLIPPAGE_BASIS_POINTS = 100n;

const getProvider = () => {
  if (!process.env.HELIUS_RPC_URL) {
    throw new Error("Please set HELIUS_RPC_URL in .env file");
  }
  const connection = new Connection(process.env.HELIUS_RPC_URL);
  // Utilise NodeWallet avec un vrai keypair du .env
  const wallet = new NodeWallet(
    Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!))
    )
  );
  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

const createAndBuyToken = async (sdk, testAccount, mint) => {
  const tokenMetadata = {
    name: "TST-7",
    symbol: "TST-7",
    description: "TST-7: This is a test token",
    filePath: join(__dirname, "logo.png"), // Mets bien le fichier dans basic/
  };

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

const buyTokens = async (sdk, testAccount, mint) => {
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
    console.log(
      "Bonding curve after buy",
      await sdk.getBondingCurveAccount(mint.publicKey)
    );
  } else {
    console.log("Buy failed");
    console.log(buyResults);
  }
};

const sellTokens = async (sdk, testAccount, mint) => {
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
      console.log(
        "Bonding curve after sell",
        await sdk.getBondingCurveAccount(mint.publicKey)
      );
    } else {
      console.log("Sell failed");
      console.log(sellResults);
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

    await printSOLBalance(connection, testAccount.publicKey, "Test Account keypair");

    const globalAccount = await sdk.getGlobalAccount();
    console.log("Global Account:", globalAccount);

    const currentSolBalance = await connection.getBalance(testAccount.publicKey);
    if (currentSolBalance === 0) {
      console.log("Please send some SOL to the test-account:", testAccount.publicKey.toBase58());
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
