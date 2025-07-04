import * as bs58 from "@coral-xyz/anchor/dist/esm/utils/bytes/bs58.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { sha256 } from "js-sha256";
import fs from "fs";

/**
 * Charge ou génère une clé privée et la sauvegarde dans un dossier
 */
export function getOrCreateKeypair(dir: string, keyName: string): Keypair {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const authorityKey = dir + "/" + keyName + ".json";
  if (fs.existsSync(authorityKey)) {
    const data: { secretKey: string; publicKey: string } = JSON.parse(fs.readFileSync(authorityKey, "utf-8"));
    return Keypair.fromSecretKey(bs58.decode(data.secretKey));
  } else {
    const keypair = Keypair.generate();
    fs.writeFileSync(
      authorityKey,
      JSON.stringify({
        secretKey: bs58.encode(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58(),
      })
    );
    return keypair;
  }
}

/**
 * Affiche le solde SOL d’un wallet
 */
export const printSOLBalance = async (connection: Connection, pubKey: PublicKey, info = "") => {
  const balance = await connection.getBalance(pubKey);
  console.log(`${info ? info + " " : ""}${pubKey.toBase58()}:`, balance / LAMPORTS_PER_SOL, `SOL`);
};

/**
 * Récupère le solde d’un token SPL (si le compte existe)
 */
export const getSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  pubKey: PublicKey,
  allowOffCurve = false
) => {
  try {
    let ata = getAssociatedTokenAddressSync(mintAddress, pubKey, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(ata, "processed");
    return balance.value.uiAmount;
  } catch (e) {
    return null;
  }
};

/**
 * Affiche le solde d’un token SPL ou indique "No Account Found"
 */
export const printSPLBalance = async (connection: Connection, mintAddress: PublicKey, user: PublicKey, info = "") => {
  const balance = await getSPLBalance(connection, mintAddress, user);
  if (balance === null) {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, "No Account Found");
  } else {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
  }
};

/**
 * Conversion valeur → base selon les décimales
 */
export const baseToValue = (base: number, decimals: number): number => base * Math.pow(10, decimals);
export const valueToBase = (value: number, decimals: number): number => value / Math.pow(10, decimals);

/**
 * Utilitaire d’identification
 */
export function getDiscriminator(name: string) {
  return sha256.digest(name).slice(0, 8);
}
