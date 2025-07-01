
require("dotenv").config();

const { PumpFun } = require("../dist");
const { Keypair } = require("@solana/web3.js");

// Récupération clé privée + RPC du .env ou des variables Railway
const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY));
const payer = Keypair.fromSecretKey(secretKey);
const rpcUrl = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

(async () => {
  const pump = new PumpFun({
    cluster: "mainnet-beta",
    payer,
    endpoint: rpcUrl,
  });

  console.log("🚀 Création du token...");
  const tx = await pump.createToken({
    name: "Univers",
    symbol: "UNV",
    image: "https://universe.test/image.png",
    description: "Token test univers - pumpdotfun-sdk",
    website: "https://universe.fake",
    twitter: "https://twitter.com/univers_test",
    telegram: "https://t.me/univers_test",
    buyAmount: 0.005, // Montant en SOL à acheter dans la foulée
  });

  console.log("✅ Token créé et acheté !", tx);

  if (tx && tx.mint) {
    console.log("🪙 Mint address :", tx.mint.toBase58());
    console.log("📄 TX signature :", tx.signature);
    console.log("Lien explorer :", "https://solscan.io/tx/" + tx.signature);
  } else {
    console.log("❌ Une erreur est survenue dans la création.");
  }
})();
