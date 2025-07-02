import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWalletImport from "@coral-xyz/anchor/dist/cjs/nodewallet.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Polyfill File and Blob
import { File } from "fetch-blob/file.js";
import { Blob } from "fetch-blob";

dotenv.config();
const NodeWallet = NodeWalletImport.default || NodeWalletImport;
const __dirname = dirname(fileURLToPath(import.meta.url));
const SLIPPAGE_BASIS_POINTS = 100n;
const LOGO_PATH = join(__dirname, "logo.png");

// Patch globalThis si besoin
if (typeof globalThis.File === "undefined") globalThis.File = File;
if (typeof globalThis.Blob === "undefined") globalThis.Blob = Blob;

const getProvider = () => {
  const connection = new Connection(process.env.HELIUS_RPC_URL!, "finalized");
  const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
  const keypair = Keypair.fromSecretKey(secretKey);
  const wallet = new NodeWallet(keypair);
  console.log(">>> Adresse Solana (PRIVATE_KEY utilisée) :", keypair.publicKey.toBase58());
  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

// Fonction test pour toutes les méthodes de file/image
const testAllImageCases = async (sdk, payer, mint) => {
  let fileBuffer = undefined;
  let nodeFile = undefined;
  let nodeBlob = undefined;
  let base64String = undefined;

  if (fs.existsSync(LOGO_PATH)) {
    fileBuffer = fs.readFileSync(LOGO_PATH);
    nodeFile = new File([fileBuffer], "logo.png", { type: "image/png" });
    nodeBlob = new Blob([fileBuffer], { type: "image/png" });
    base64String = fileBuffer.toString("base64");
    console.log("✅ Image détectée, on teste toutes les méthodes...");
  } else {
    console.log("❌ Pas de logo.png, certains tests seront ignorés.");
  }

  // --- CAS A: Sans image ---
  const A = { name: "TST-NOIMG", symbol: "NOIMG", description: "A: Sans image" };

  // --- CAS B: filePath ---
  const B = fileBuffer ? {
    name: "TST-FILEPATH", symbol: "FPATH", description: "B: Avec filePath", filePath: LOGO_PATH
  } : undefined;

  // --- CAS C: File node ---
  const C = nodeFile ? {
    name: "TST-NODEFILE", symbol: "NFILE", description: "C: Avec File node", file: nodeFile
  } : undefined;

  // --- CAS D: Buffer node ---
  const D = fileBuffer ? {
    name: "TST-BUFFER", symbol: "BUFF", description: "D: Buffer node", file: fileBuffer
  } : undefined;

  // --- CAS E: Blob node ---
  const E = nodeBlob ? {
    name: "TST-BLOB", symbol: "NBLOB", description: "E: Blob node", file: nodeBlob
  } : undefined;

  // --- CAS F: Base64 string (pour rigoler) ---
  const F = base64String ? {
    name: "TST-B64", symbol: "B64", description: "F: Base64 string", file: base64String
  } : undefined;

  // Table des essais à jouer
  const testCases = [
    ["A (no image)", A],
    ["B (filePath)", B],
    ["C (File node)", C],
    ["D (Buffer node)", D],
    ["E (Blob node)", E],
    ["F (base64 string)", F]
  ].filter(([_, obj]) => obj); // Retirer les cas sans image si pas de logo.png

  for (const [label, meta] of testCases) {
    console.log("\n======= TEST", label, "=======");
    try {
      const mintTest = Keypair.generate();
      const res = await sdk.createAndBuy(
        payer,
        mintTest,
        meta,
        BigInt(0.0001 * LAMPORTS_PER_SOL),
        SLIPPAGE_BASIS_POINTS,
        {
          unitLimit: 250000,
          unitPrice: 250000,
        }
      );
      if (res.success) {
        console.log(`[${label}] ✅ Mint réussi:`, `https://pump.fun/${mintTest.publicKey.toBase58()}`);
      } else {
        console.error(`[${label}] ❌ Echec:`, res.error?.message || res.error || res);
      }
    } catch (e) {
      console.error(`[${label}] Exception:`, e.message || e);
    }
  }
};

const main = async () => {
  try {
    console.log("\n========= [MAIN] Début script TEST FILES ===========");
    const provider = getProvider();
    const sdk = new PumpFunSDK(provider);
    const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
    const payer = Keypair.fromSecretKey(secretKey);

    // Affiche solde du wallet principal
    const sol = await provider.connection.getBalance(payer.publicKey);
    console.log(`[MAIN] Ton wallet ${payer.publicKey.toBase58()}: ${sol / LAMPORTS_PER_SOL} SOL`);
    if (sol === 0) {
      console.log("Please send some SOL to le wallet:", payer.publicKey.toBase58());
      return;
    }

    // Global account pour log
    const globalAccount = await sdk.getGlobalAccount();
    console.log("[MAIN] GlobalAccount:", globalAccount);

    await testAllImageCases(sdk, payer, Keypair.generate());
    console.log("\n========= [MAIN] Fin script ===========");
  } catch (error) {
    console.error("[MAIN] Fatal error:", error);
  }
};

main();
