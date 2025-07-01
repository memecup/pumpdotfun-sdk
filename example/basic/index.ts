import dotenv from "dotenv";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { PumpFunSDK } from "../../src"; // adapte si le chemin change
import fs from "fs";

// ----- Chargement .env (inutile sur Railway, mais safe en dev)
dotenv.config();

// ---- Sécurité .env
if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY missing!');
if (!process.env.HELIUS_RPC_URL) throw new Error('HELIUS_RPC_URL missing!');

// ---- Wallet & Connection ----
const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();
const connection = new Connection(process.env.HELIUS_RPC_URL!, "confirmed");

// ---- Image pour le token ----
const imagePath = "example/basic/logo.png"; // Mets ton image ici
let fileBuffer: Buffer | undefined = undefined;
if (fs.existsSync(imagePath)) {
  fileBuffer = fs.readFileSync(imagePath);
  console.log("✅ Image trouvée pour le mint !");
} else {
  console.log("❌ Aucune image trouvée à ce chemin. Mint SANS image !");
}

// ---- Paramètres token ----
const meta = {
  name: "UniverseToken",
  symbol: "UNIV",
  description: "A fun universe-themed test token on Pump.fun! 🚀",
  file: fileBuffer ? new File([fileBuffer], "logo.png") : undefined, // File = global dans Node >=18, sinon polyfill (voir plus bas)
  // Tu peux ajouter "external_url", "twitter", "website", etc. ici
};

// ---- Montant à acheter ----
const buyAmountSol = 0.005;
const slippage = 500n;

(async () => {
  try {
    // -------- Mint du token --------
    console.log("⏳ Mint du token...");
    const sdk = new PumpFunSDK({
      connection,
      payer: creator,
    });

    const mintResult = await sdk.createToken(
      creator,
      mint,
      meta
    );
    console.log("✅ Token minté ! Mint:", mint.publicKey.toBase58());
    console.log("Attends l'indexation sur pump.fun (30s à 2min max)...");

    // -------- Auto-buy en boucle (anti-snipe) --------
    const retryDelayMs = 2000;
    const mintAddress = mint.publicKey.toBase58();
    let bought = false;
    while (!bought) {
      try {
        console.log(`⏳ Tentative d'achat sur ${mintAddress}...`);
        const buyResult = await sdk.buyToken(
          creator,
          new PublicKey(mintAddress),
          BigInt(buyAmountSol * 1e9),
          slippage
        );
        console.log("🚀 Achat réussi ! Résultat :", buyResult);
        bought = true;
      } catch (e: any) {
        const msg = (e && e.message) ? e.message : e.toString();
        if (
          msg.includes("ConstraintSeeds") ||
          msg.includes("not indexed") ||
          msg.includes("custom program error") ||
          msg.includes("Simulation failed")
        ) {
          console.log("⏳ Pas encore indexé, retry dans 2s...");
          await new Promise((res) => setTimeout(res, retryDelayMs));
        } else {
          console.error("❌ Erreur inconnue lors du buy :", msg);
          break;
        }
      }
    }
    console.log(`🎉 Flow terminé ! Mint: ${mintAddress}`);
    console.log(`🧩 Pump.fun link: https://pump.fun/${mintAddress}`);

  } catch (err: any) {
    console.error("Erreur dans le flow :", err.message || err);
  }
})();

/*
💡 Si tu es en Node < 18 (et que tu as une erreur "File is not defined"), ajoute au tout début du fichier :
import { File } from 'node-fetch';
ou installe "fetch-blob" et fais :
import { File } from 'fetch-blob';
Puis remplace new File(...) par new File([fileBuffer], "logo.png", { type: "image/png" });
*/
