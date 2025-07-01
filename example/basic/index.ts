import dotenv from "dotenv";
import { Keypair, Connection } from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import fs from "fs";
import { File as FetchFile } from "fetch-blob/from.js"; // Assure-toi d'avoir installé fetch-blob

dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY manquant dans .env');
if (!process.env.HELIUS_RPC_URL) throw new Error('HELIUS_RPC_URL manquant dans .env');

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();

console.log("PRIVATE_KEY (wallet):", creator.publicKey.toBase58());
console.log("Adresse du mint créé :", mint.publicKey.toBase58());

const connection = new Connection(process.env.HELIUS_RPC_URL!, "confirmed");

const sdk = new PumpFunSDK({
  payer: creator,
  connection: connection,
});

// --- Gestion image robuste ---
const meta: any = {
  name: "UniverseToken",
  symbol: "UNIV",
  description: "A fun universe-themed test token on Pump.fun! 🚀"
};

const imagePath = "example/basic/logo.png"; // Mets ton image ici
if (fs.existsSync(imagePath)) {
  const fileBuffer = fs.readFileSync(imagePath);
  // Solution compatible partout :
  meta.file = new FetchFile([fileBuffer], "logo.png", { type: "image/png" });
  console.log("✅ Image trouvée et ajoutée à meta !");
} else {
  console.log("❌ Pas d'image trouvée, mint SANS image !");
}

const buyAmountSol = 0.005;
const slippage = 500n;

(async () => {
  try {
    console.log("⏳ Mint + buy du token...");
    const result = await sdk.createAndBuy(
      creator,
      mint,
      meta,
      BigInt(buyAmountSol * 1e9),
      slippage
    );
    if (result && result.success) {
      console.log("🚀 Mint + buy réussi ! Résultat :", result);
      console.log(`Lien Pump.fun : https://pump.fun/${mint.publicKey.toBase58()}`);
    } else {
      console.log("❌ Mint fait mais BUY échoué (token pas indexé). Relance le script pour buy dès que pump.fun le permet.");
      console.log(result);
    }
  } catch (err: any) {
    console.error("❌ Erreur dans le flow :", err.message || err);
  }
})();
