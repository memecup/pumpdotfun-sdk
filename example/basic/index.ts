import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { PumpFunSDK } from "../../src";

dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY missing!');
if (!process.env.HELIUS_RPC_URL) throw new Error('HELIUS_RPC_URL missing!');

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();

(async () => {
  const sdk = new PumpFunSDK({
    rpc: process.env.HELIUS_RPC_URL,
    payer: creator,
  });

  const meta = {
    name: "UniverseToken",
    symbol: "UNIV",
    description: "A fun universe-themed test token on Pump.fun! 🚀"
    // AUCUN champ image, filePath ou uri ici !
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
