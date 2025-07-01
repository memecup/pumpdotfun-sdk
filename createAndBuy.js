// createAndBuy.js
import { PumpFun, Cluster } from "pumpdotfun-sdk";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

// 1. Clé privée fournie par l'utilisateur
const secretKey = Uint8Array.from([32,18,44,10,170,72,224,250,51,253,198,176,210,47,32,178,174,180,147,137,17,201,210,104,135,65,42,50,12,218,224,254,34,215,119,180,60,6,20,87,58,46,50,245,2,94,112,72,165,228,178,163,231,112,186,80,247,140,85,25,137,123,113,24]);
const wallet = Keypair.fromSecretKey(secretKey);

// 2. Connexion réseau (MAINNET)
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
const sdk = new PumpFun(connection, Cluster.Mainnet);

// 3. Définis tes métadatas
const name = "Univers";
const symbol = "UNI";
const image = "https://placehold.co/256x256/univers.png";
const description = "Token de test Univers via script!";
const twitter = "https://twitter.com/universTest";
const telegram = "https://t.me/universTest";
const website = "https://univers-test.fake";

// 4. Création du token
(async () => {
  try {
    // Vérification du solde
    const solBalance = await connection.getBalance(wallet.publicKey);
    console.log(`SOL dispo : ${solBalance / LAMPORTS_PER_SOL} SOL`);

    if (solBalance < 0.01 * LAMPORTS_PER_SOL) {
      throw new Error("Solde insuffisant pour créer et acheter.");
    }

    // Création du token
    console.log("⏳ Création du token...");
    const { tx, mint, bondingCurve } = await sdk.createToken({
      payer: wallet,
      name,
      symbol,
      image,
      description,
      twitter,
      telegram,
      website,
      // Optionnel : supply, decimals etc.
    });
    console.log("✅ Token créé !");
    console.log("Mint :", mint.toBase58());
    console.log("Bonding Curve :", bondingCurve.toBase58());
    console.log("TX création :", tx);

    // Achat instantané du token (0.005 SOL)
    const amountInSol = 0.005;
    console.log(`⏳ Achat de ${amountInSol} SOL du token...`);
    const buyResult = await sdk.buy({
      payer: wallet,
      mint,
      bondingCurve,
      amountSol: amountInSol,
    });
    console.log("✅ Achat effectué !");
    console.log("TX achat :", buyResult.tx);

    // Affiche lien explorer
    console.log(`🔗 Explorer création : https://solscan.io/tx/${tx}`);
    console.log(`🔗 Explorer achat    : https://solscan.io/tx/${buyResult.tx}`);

  } catch (e) {
    console.error("Erreur :", e.message || e);
  }
})();
