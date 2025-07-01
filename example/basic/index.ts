import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config();

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
const payer = Keypair.fromSecretKey(secretKey);
const connection = new Connection(process.env.HELIUS_RPC_URL!);

(async () => {
    console.log("Test TX depuis:", payer.publicKey.toBase58());
    const recipient = "DESTINATION_WALLET_HERE"; // Mets l'adresse d'un de tes autres wallets
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: recipient,
            lamports: 0.001 * LAMPORTS_PER_SOL,
        })
    );
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log("✅ Transfert fait ! Signature :", sig);
})();
