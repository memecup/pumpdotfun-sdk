import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { PumpFunSDK } from "../../src"; // adapte le chemin si besoin
import fs from "fs";
import { File } from "fetch-blob"; // Polyfill web File/Blob

dotenv.config();

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const creator = Keypair.fromSecretKey(secretKey);
const mint = Keypair.generate();

const imagePath = "example/basic/random.png";
let fileBuffer: Buffer | undefined = undefined;
let fileObject: File | undefined = undefined;
if (fs.existsSync(imagePath)) {
  fileBuffer = fs.readFileSync(imagePath);
  fileObject = new File([fileBuffer], "logo.png", { type: "image/png" });
  console.log("✅ Image locale trouvée !");
}

const meta = {
  name: "UniverseToken",
  symbol: "UNIV",
  description: "A fun universe-themed test token on Pump.fun! 🚀",
  file: fileObject,
  external_url: "https://universe-token.io",
  attributes: [],
  telegram: "https://t.me/universetoken",
  website: "https://universe-token.io",
  twitter: "https://twitter.com/universetoken"
};

const sdk = new PumpFunSDK({
  rpc: process.env.HELIUS_RPC_URL!,
  payer: creator,
});

(async () => {
  console.log(`Test TX depuis: ${creator.publicKey.toBase58()}`);

  // Mint le token avec image uploadée
  console.log("⏳ Mint du token avec image locale...");
  const mintResult = await sdk.createToken(creator, mint, meta);
  if (!mintResult || mintResult.error) {
    console.error("❌ Erreur lors du mint :", mintResult?.error || mintResult);
    process.exit(1);
  }
  console.log("✅ Mint réussi !", mint.publicKey.toBase58());

  // Achète le token en boucle jusqu'à succès (option anti-snipe)
  let buySuccess = false;
  let lastError = null;
  while (!buySuccess) {
    try {
      const buyResult = await sdk.buyToken(
        creator,
        mint,
        BigInt(0.005 * 1e9),
        500n
      );
      if (buyResult && !buyResult.error) {
        console.log("✅ Achat réussi ! Résultat :", buyResult);
        buySuccess = true;
      } else {
        throw new Error(buyResult.error || "Achat échoué, retry...");
      }
    } catch (e) {
      lastError = e;
      console.log("⏳ Achat non encore possible (token non indexé ?), retry dans 2s...");
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  console.log("🎉 TOKEN MINT + BUY TERMINÉ !");
})();
