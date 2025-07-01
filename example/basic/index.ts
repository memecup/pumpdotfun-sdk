import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { PumpFunSDK } from "../../src"; // chemin relatif depuis example/basic/

// Load .env in dev, Railway injectera les vars automatiquement en prod
dotenv.config();

// ----- CONFIG -------
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
    name: "Univers",
    symbol: "UNV",
    description: "Token test univers",
    image: "https://ipfs.io/ipfs/bafkreidgko6n7r2va2zjbzp4qaj6ybb4vrxafukknkl7qcnbyhn7pxejty", // <-- Image IPFS Pinata
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
