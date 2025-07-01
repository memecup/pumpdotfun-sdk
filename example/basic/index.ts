import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { PumpFunSDK } from "../../src";
import fs from "fs";

dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY missing!');
if (!process.env.HELIUS_RPC_URL) throw new Error('HELIUS_RPC_URL missing!');

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();

// Chemin vers l'image incluse dans le repo
const imagePath = "example/basic/logo.png"; // Mets un PNG ici dans le repo
const fileBuffer = fs.readFileSync(imagePath);

(async () => {
  const sdk = new PumpFunSDK({
    rpc: process.env.HELIUS_RPC_URL,
    payer: creator,
  });

  const meta = {
    name: "UniverseToken",
    symbol: "UNIV",
    description: "A fun universe-themed test token on Pump.fun! 🚀",
    file: new File([fileBuffer], "logo.png"), // File attendu par le SDK (besoin du package "file-api" ou natif Node.js >=20)
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
