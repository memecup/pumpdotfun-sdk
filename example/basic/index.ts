import dotenv from "dotenv";
import { Keypair, Connection } from "@solana/web3.js";
import { PumpFun } from "../../src"; // <- TESTE AVEC PumpFun
import fs from "fs";

dotenv.config();
if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY manquant dans .env');
if (!process.env.HELIUS_RPC_URL) throw new Error('HELIUS_RPC_URL manquant dans .env');

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();
console.log("PRIVATE_KEY (wallet):", creator.publicKey.toBase58());
console.log("Adresse du mint créé :", mint.publicKey.toBase58());

const connection = new Connection(process.env.HELIUS_RPC_URL!, "confirmed");
const imagePath = "example/basic/logo.png";
let fileBuffer: Buffer | undefined = undefined;
if (fs.existsSync(imagePath)) {
  fileBuffer = fs.readFileSync(imagePath);
  console.log("✅ Image trouvée pour le mint !");
} else {
  console.log("❌ Pas d'image trouvée, mint SANS image !");
}

const sdk = new PumpFun({
  connection,
  payer: creator,
});

const meta: any = {
  name: "UniverseToken",
  symbol: "UNIV",
  description: "A fun universe-themed test token on Pump.fun! 🚀",
};
if (fileBuffer) {
  try {
    meta.file = new File([fileBuffer], "logo.png", { type: "image/png" });
  } catch {
    const { File } = require("fetch-blob");
    meta.file = new File([fileBuffer], "logo.png", { type: "image/png" });
  }
}

(async () => {
  try {
    console.log("⏳ Test mint seul via PumpFun...");
    // CHANGE ICI selon la méthode existante
    const mintResult = await sdk.createToken(
      creator,
      mint,
      meta
    );
    if (mintResult && mintResult.success) {
      console.log("✅ Mint via PumpFun réussi !");
      console.log("Adresse du mint :", mint.publicKey.toBase58());
      console.log(`Lien Pump.fun : https://pump.fun/${mint.publicKey.toBase58()}`);
      console.log("mintResult =", mintResult);
    } else {
      console.log("❌ Mint via PumpFun échoué :", mintResult);
    }
  } catch (err: any) {
    console.error("❌ Erreur pendant le mint SDK PumpFun :", err.message || err);
    console.error(Object.keys(sdk));
  }
})();
