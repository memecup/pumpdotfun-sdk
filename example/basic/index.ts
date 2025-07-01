import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEFAULT_DECIMALS, PumpFunSDK } from "pumpdotfun-sdk";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
} from "./util"; // Ce fichier doit être présent, cf. README

dotenv.config();

const KEYS_FOLDER = __dirname + "/.keys";
const SLIPPAGE_BASIS_POINTS = 100n;

// ------------------------
// PROVIDER ANCHOR SOLANA
// ------------------------
const getProvider = () => {
  if (!process.env.HELIUS_RPC_URL) {
    throw new Error("HELIUS_RPC_URL manquant dans .env");
  }
  const connection = new Connection(process.env.HELIUS_RPC_URL);
  const wallet = new NodeWallet(getOrCreateKeypair(KEYS_FOLDER, "test-account"));
  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

const createAndBuyToken = async (sdk, testAccount, mint) => {
  const tokenMetadata = {
    name: "TST-7",
    symbol: "TST-7",
    description: "TST-7: This is a test token",
    filePath: "example/basic/logo.png", // Mets un PNG ici si tu veux une image
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
    console.log("✅ Mint + Buy réussi:", `https://pump.fun/${mint.publicKey.toBase58()}`);
    printSPLBalance(sdk.connection, mint.publicKey, testAccount.publicKey);
  } else {
    console.log("❌ Create and Buy failed");
  }
};

// ... (laisse buyTokens et sellTokens comme dans ton exemple ci-dessus)

const main = async () => {
  try {
    const provider = getProvider();
    const sdk = new PumpFunSDK(provider);
    const connection = provider.connection;

    const testAccount = getOrCreateKeypair(KEYS_FOLDER, "test-account");
    const mint = getOrCreateKeypair(KEYS_FOLDER, "mint");

    await printSOLBalance(connection, testAccount.publicKey, "Test Account keypair");

    const globalAccount = await sdk.getGlobalAccount();
    console.log("Global Pumpfun account :", globalAccount);

    const currentSolBalance = await connection.getBalance(testAccount.publicKey);
    if (currentSolBalance === 0) {
      console.log("❌ Envoie un peu de SOL à ce wallet test :", testAccount.publicKey.toBase58());
      return;
    }

    let bondingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    if (!bondingCurveAccount) {
      await createAndBuyToken(sdk, testAccount, mint);
      bondingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    }

    if (bondingCurveAccount) {
      // Tu peux activer les lignes suivantes pour acheter/vendre ensuite
      // await buyTokens(sdk, testAccount, mint);
      // await sellTokens(sdk, testAccount, mint);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

main();
