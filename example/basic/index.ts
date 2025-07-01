import dotenv from "dotenv";
import { Keypair, Connection } from "@solana/web3.js";
// 👉 Adapte ici selon l'export réel du SDK (PumpFunSDK OU PumpFun)
import { PumpFunSDK } from "../../src"; // ou { PumpFun }
import fs from "fs";

// Load .env en dev (inutile sur Railway mais safe)
dotenv.config();

// --- Checks ---
if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY manquant dans .env');
if (!process.env.HELIUS_RPC_URL) throw new Error('HELIUS_RPC_URL manquant dans .env');

// --- Wallet & Connection
const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();
console.log("PRIVATE_KEY:", creator.publicKey.toBase58());
console.log("Adresse du mint créé :", mint.publicKey.toBase58());

const connection = new Connection(process.env.HELIUS_RPC_URL!, "confirmed");

// --- Image optionnelle
const imagePath = "example/basic/logo.png"; // Mets logo.png ici si tu veux un mint avec image
let fileBuffer: Buffer | undefined = undefined;
if (fs.existsSync(imagePath)) {
  fileBuffer = fs.readFileSync(imagePath);
  console.log("✅ Image trouvée pour le mint !");
} else {
  console.log("❌ Pas d'image trouvée, mint SANS image !");
}

// --- Instanciation SDK ---
// (Si tu as { PumpFun } à l'export, remplace par PumpFun)
const sdk = new PumpFunSDK({
  connection,
  payer: creator,
});

// --- Paramètres Token ---
const meta: any = {
  name: "UniverseToken",
  symbol: "UNIV",
  description: "A fun universe-themed test token on Pump.fun! 🚀",
};
// Gestion de l'image
if (fileBuffer) {
  try {
    // Pour Node >= 18
    meta.file = new File([fileBuffer], "logo.png", { type: "image/png" });
  } catch {
    // Pour Node < 18, installer fetch-blob : npm install fetch-blob
    const { File } = require("fetch-blob");
    meta.file = new File([fileBuffer], "logo.png", { type: "image/png" });
  }
}

const buyAmountSol = 0.005; // à acheter direct après le mint
const slippage = 500n;

(async () => {
  try {
    console.log("⏳ Mint + buy du token...");
    // Si createAndBuy existe
    const result = await sdk.createAndBuy(
      creator,
      mint,
      meta,
      BigInt(buyAmountSol * 1e9),
      slippage
    );
    // Gestion du retour
    if (result && result.success) {
      console.log("🚀 Mint + buy réussi ! Résultat :", result);
      console.log(`Lien Pump.fun : https://pump.fun/${mint.publicKey.toBase58()}`);
    } else {
      // Cas fréquent : buy trop tôt, doit être relancé
      console.log("❌ Mint fait mais BUY échoué (token pas indexé). Relance le script pour buy dès que pump.fun le permet.");
      console.log(result);
    }
  } catch (err: any) {
    // Si createAndBuy n'existe pas, erreur claire
    if (err.message && err.message.includes("is not a function")) {
      console.error("❌ Problème d'API du SDK : la méthode createAndBuy() n’existe pas !");
      console.error("Teste à la place sdk.createToken puis sdk.buyToken séparément, OU change PumpFunSDK => PumpFun.");
    } else {
      console.error("❌ Erreur dans le flow :", err.message || err);
    }
  }
})();
