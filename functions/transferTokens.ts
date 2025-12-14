import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import {
    Connection,
    clusterApiUrl,
    Keypair,
    SystemProgram,
    Transaction as SolanaTransaction,
    PublicKey,
} from 'npm:@solana/web3.js@1.78.5';
import { 
    getOrCreateAssociatedTokenAccount, 
    createTransferInstruction,
    TOKEN_2022_PROGRAM_ID
} from 'npm:@solana/spl-token@0.3.8';

const VIN_TOKEN_MINT_ADDRESS = "DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.wallet_secret_key || user.wallet_secret_key.length === 0) {
            return Response.json({ error: 'Unauthorized or wallet not configured' }, { status: 401 });
        }

        const { recipientAddress, amount, tokenType } = await req.json();
        
        // Connect to the Solana MAINNET cluster
        const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

        const secretKeyUint8 = new Uint8Array(user.wallet_secret_key);
        const fromKeypair = Keypair.fromSecretKey(secretKeyUint8);
        const toPublicKey = new PublicKey(recipientAddress);

        const transaction = new SolanaTransaction();
        
        if (tokenType === 'SOL') {
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: toPublicKey,
                    lamports: amount * 1_000_000_000, // Convert SOL to lamports
                })
            );
        } else if (tokenType === 'VIN') {
            const mintPublicKey = new PublicKey(VIN_TOKEN_MINT_ADDRESS);

            const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                fromKeypair,
                mintPublicKey,
                fromKeypair.publicKey,
                false,
                'confirmed',
                {},
                TOKEN_2022_PROGRAM_ID // Use Token 2022 program
            );

            const toTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                fromKeypair,
                mintPublicKey,
                toPublicKey,
                false,
                'confirmed',
                {},
                TOKEN_2022_PROGRAM_ID // Use Token 2022 program
            );

            transaction.add(
                createTransferInstruction(
                    fromTokenAccount.address,
                    toTokenAccount.address,
                    fromKeypair.publicKey,
                    amount * 1_000_000, // $VIN has 6 decimals
                    [],
                    TOKEN_2022_PROGRAM_ID // Use Token 2022 program
                )
            );
        } else {
            return Response.json({ error: 'Invalid token type' }, { status: 400 });
        }

        const signature = await connection.sendTransaction(transaction, [fromKeypair]);
        await connection.confirmTransaction(signature, 'confirmed');

        console.log(`Mainnet Token 2022 transfer successful! Signature: ${signature}`);

        // Create a record of the transaction in the database
        await base44.asServiceRole.entities.Transaction.create({
            user_id: user.id,
            sender_wallet: fromKeypair.publicKey.toBase58(),
            receiver_wallet: recipientAddress,
            token_type: tokenType,
            amount: amount,
            status: 'completed',
            transaction_hash: signature,
        });

        return Response.json({
            success: true,
            transaction_hash: signature,
            tokenProgram: tokenType === 'VIN' ? 'Token 2022' : 'Native'
        });

    } catch (error) {
        console.error('Error in mainnet Token 2022 transferTokens:', error);
        return Response.json({
            error: 'Transfer failed',
            details: error.message
        }, { status: 500 });
    }
});