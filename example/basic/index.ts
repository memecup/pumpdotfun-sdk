import dotenv from "dotenv";
import { Keypair, Connection } from "@solana/web3.js";
import { PumpFunSDK } from "../../src";
import fs from "fs";

dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY missing!');
if (!process.env.HELIUS_RPC_URL) throw new Error('HELIUS_RPC_URL missing!');

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();

const imagePath = "example/basic/logo.png"; // Mets le PNG ici
const fileBuffer = fs.readFileSync(imagePath);

// Correction ici : crée la connection explicitement !
const connection = new Connection(process.env.HELIUS_RPC_URL, "confirmed");

(async () => {
  const sdk = new PumpFunSDK({
    connection, // <-- et pas "rpc"
    payer: creator,
  });

  const meta = {
    name: "UniverseToken",
    symbol: "UNIV",
    description: "A fun universe-themed test token on Pump.fun! 🚀",
    file: new File([fileBuffer], "logo.png"),
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
