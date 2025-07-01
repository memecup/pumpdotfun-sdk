import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { PumpFunSDK } from "../../src";
dotenv.config();

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();

const meta = {
  name: "Univers",
  symbol: "UNV",
  description: "Token test univers",
  image: "https://gateway.pinata.cloud/ipfs/bafkreidgko6n7r2va2zjbzp4qaj6ybb4vrxafukknkl7qcnbyhn7pxejty"
};

const buyAmountSol = 0.005;
const slippage = 500n;

(async () => {
  const sdk = new PumpFunSDK({
    rpc: process.env.HELIUS_RPC_URL!,
    payer: creator,
  });

  const result = await sdk.createAndBuy(
    creator,
    mint,
    meta,
    BigInt(buyAmountSol * 1e9),
    slippage
  );
  console.log("✅ Token créé & acheté ! Résultat :", result);
})();
