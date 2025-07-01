import { Connection, PublicKey } from "@solana/web3.js";

// REMPLACE par ton endpoint (Helius conseillé)
const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// Adresse à scanner (le wallet qui a mint les tokens)
const CREATOR_PUBKEY = "3M1RVomWfJcvKLt9yNPPVsHVATi1x9fPzz9n6DiWA4L7"; // <-- à changer si besoin

async function findCreatedMints(creatorAddress) {
  const creator = new PublicKey(creatorAddress);
  // Scan des transactions du wallet (attention, limité à 1 000 max par requête, plus pour Helius)
  const sigs = await connection.getSignaturesForAddress(creator, { limit: 1000 });

  let foundMints = [];
  for (const sig of sigs) {
    // Récupérer la transaction complète
    const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) continue;

    // Parcourir les instructions pour chercher des mints
    for (const ix of tx.transaction.message.instructions) {
      // Vérifie si l'instruction est un mint SPL (Token program)
      if (
        ix.programId.toBase58() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" && // SPL Token
        ix.data &&
        (ix.data.startsWith("6") || ix.data.length === 2) // mintTo or InitializeMint
      ) {
        // Généralement, le mint créé est dans les keys
        const mintAccount = tx.transaction.message.accountKeys[ix.accounts[0]].toBase58();
        foundMints.push(mintAccount);
      }
    }
  }

  // Suppression des doublons
  foundMints = [...new Set(foundMints)];
  return foundMints;
}

(async () => {
  console.log("Recherche des mints créés par :", CREATOR_PUBKEY);
  const mints = await findCreatedMints(CREATOR_PUBKEY);
  if (mints.length) {
    console.log("Mints trouvés:");
    mints.forEach(mint => console.log(mint));
  } else {
    console.log("Aucun mint trouvé pour ce wallet.");
  }
})();
