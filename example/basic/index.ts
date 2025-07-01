import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { PumpFunSDK } from "../../src";
import fs from "fs";
import File from "fetch-blob/file.js"; // ✅ la bonne importation

dotenv.config();

// ----- CONFIG -------
const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();

const imagePath = "example/basic/random.png";

(async () => {
  let fileBuffer: Buffer | undefined = undefined;
  let file: any = undefined;
  if (fs.existsSync(imagePath)) {
    fileBuffer = fs.readFileSync(imagePath);
    file = new File([fileBuffer], "logo.png", { type: "image/png" });
    console.log("✅ Image trouvée pour le mint !");
  }

  const sdk = new PumpFunSDK({
    rpc: process.env.HELIUS_RPC_URL!,
    payer: creator,
  });

  const meta = {
    name: "Univers",
    symbol: "UNV",
    description: "Token test univers",
    file: file, // Polyfill File object
  };

  const buyAmountSol = 0.005;
  const slippage = 500n;

  console.log("⏳ Mint + buy du token...");
  const result = await sdk.createAndBuy(
    creator,
    mint,
    meta,
    BigInt(buyAmountSol * 1e9),
    slippage
  );
  console.log("✅ Token créé & acheté ! Résultat :", result);
})();
