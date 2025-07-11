import "dotenv/config";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK } from "pumpdotfun-repumped-sdk";

const RPC_URL = process.env.HELIUS_RPC_URL!;
const SLIPPAGE_BPS = 300n;
const PRIORITY_FEE = { unitLimit: 250_000, unitPrice: 250_000 };

// Liste des 10 tokens MEMECUP (remplace si besoin)
const TOKENS = [
  "BPTvvQqtDGacQcgC2kMsBLyHAGpHtARMtmzhV3a4U4Mh", // USA
  "DqZZ95aevCPR5HtdmPMRfyjopb2CDLTBxWnjfwyUWwkS", // CHN
  "5ZYxH8865qQdfNi3fS5uk87di3mwjp8fci5uzVmKVC25", // ARG
  "BwFRFGypNmD1kQFQwXME26jZUQKNSanMvdpVHfyXcKCv", // BRA
  "9MTd5W1crDjsBohDyXDNhGhLJmPPNS4MUR4oRiHJM5VN", // IND
  "6dNXpBDEG7B2u2dqH8ChiPiQDLz58J4oYceNJLYdNgnW", // JPN
  "CSHwvxjpjybS11zpo1zjJHhWKjvueSWieLQcbdCDY5uj", // KOR
  "9yVy1v737HgkEUDFDZwq1y2Y3Baab8r9bnMLgkii4eoK", // GER
  "FePGgV7JAUT92fSZ4DAMcPrhYZHAT3iSAGs8UVNrznAa", // ESP
  "8SHQtU6Whd3Fm2S1JdVDaxG8xAkVBvtLt5M5hRE7Whuy", // CHE
];

const AMOUNT_SOL = 0.01;      // Quantité à buy/sell par token
const CYCLE_MINUTES = 60;     // Toutes les X minutes (ici 1h)

function loadWallet(envVar: string, label: string): Keypair {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`No key for ${label}`);
  const secret = JSON.parse(raw);
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buySell(sdk: PumpFunSDK, wallet: Keypair, mintStr: string) {
  try {
    const mint = new PublicKey(mintStr);
    const lamports = BigInt(Math.floor(AMOUNT_SOL * LAMPORTS_PER_SOL));

    // BUY
    await sdk.trade.buy(wallet, mint, lamports, SLIPPAGE_BPS, PRIORITY_FEE);
    console.log(`✅ Buy 0.01 SOL on ${mintStr}`);

    // Optionnel : petit délai (ex : 2 sec) pour la confirmation
    await delay(2000);

    // SELL
    await sdk.trade.sell(wallet, mint, lamports, SLIPPAGE_BPS, PRIORITY_FEE);
    console.log(`✅ Sell 0.01 SOL on ${mintStr}`);
  } catch (e: any) {
    console.error(`⛔ Buy/Sell failed for ${mintStr}:`, e.message || e);
  }
}

async function main() {
  console.log("======= MEMECUP VOLUME BOT =======");
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = loadWallet("PRIVATE_KEY_TRENDING", "trending");
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: "confirmed" });
  const sdk = new PumpFunSDK(provider);

  while (true) {
    const start = Date.now();
    for (const mint of TOKENS) {
      await buySell(sdk, wallet, mint);
      await delay(2500); // (Optionnel) petite pause entre tokens pour éviter de spammer
    }
    const elapsed = (Date.now() - start) / 1000;
    console.log(`⏳ Cycle complete in ${elapsed.toFixed(1)} sec. Next run in ${CYCLE_MINUTES} minutes.\n`);
    await delay(CYCLE_MINUTES * 60 * 1000);
  }
}

main().catch(console.error);
