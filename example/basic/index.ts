import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { PumpFunSDK } from "../../src"; // chemin relatif depuis example/basic/
import fs from "fs";

// Load .env in dev, Railway injectera les vars automatiquement en prod
dotenv.config();

// ----- CONFIG -------
const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();

const imagePath = "example/basic/random.png"; // optionnel, ou met une URL si tu préfères

(async () => {
  // Prépare le buffer image si présent (peut être omis si non utilisé)
  let fileBuffer: Buffer | undefined = undefined;
  if (fs.existsSync(imagePath)) {
    fileBuffer = fs.readFileSync(imagePath);
  }

  const sdk = new PumpFunSDK({
    rpc: process.env.HELIUS_RPC_URL!,
    payer: creator,
  });

  const meta = {
    name: "Univers",
    symbol: "UNV",
    description: "Token test univers",
    filePath: fileBuffer ? imagePath : undefined, // gère le cas sans image
  };

  const buyAmountSol = 0.005;
  const slippage = 500n;

  const result = await sdk.createAndBuy(
    creator,
    mint,
    meta,
    BigInt(buyAmountSol * 1e9),
    slippage
  );
  console.log("✅ Token créé & acheté ! Résultat :", result);
})();
