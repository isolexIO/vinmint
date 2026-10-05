// Backend function: transferTokens
// Uses shared solanaWallet module (tweetnacl + raw RPC) instead of @solana/web3.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import {
    keypairFromSecretKey,
    isValidPublicKey,
    transferSol,
    transferVinTokens,
    getTokenAccountsByOwner
} from '../../shared/solanaWallet.ts';

const VIN_TOKEN_MINT_ADDRESS = "DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.wallet_secret_key || user.wallet_secret_key.length === 0) {
            return Response.json({ error: 'Unauthorized or wallet not configured' }, { status: 401 });
        }

        const { recipientAddress, amount, tokenType } = await req.json();

        if (!recipientAddress || !amount || amount <= 0) {
            return Response.json({ error: 'Recipient address and positive amount are required' }, { status: 400 });
        }

        if (!isValidPublicKey(recipientAddress)) {
            return Response.json({ error: 'Invalid recipient wallet address' }, { status: 400 });
        }

        const fromKeypair = keypairFromSecretKey(new Uint8Array(user.wallet_secret_key));

        let signature: string;

        if (tokenType === 'SOL') {
            signature = await transferSol(fromKeypair, recipientAddress, amount);
        } else if (tokenType === 'VIN') {
            // Find sender's token account
            const fromTokenAccount = await getTokenAccountsByOwner(fromKeypair.publicKeyBase58, VIN_TOKEN_MINT_ADDRESS);
            if (!fromTokenAccount) {
                return Response.json({
                    error: 'You do not have a VIN token account. Please receive VIN tokens first to create one.',
                }, { status: 400 });
            }

            // Find recipient's token account
            const toTokenAccount = await getTokenAccountsByOwner(recipientAddress, VIN_TOKEN_MINT_ADDRESS);
            if (!toTokenAccount) {
                return Response.json({
                    error: 'Recipient does not have a VIN token account. They need to receive VIN tokens first to create one.',
                }, { status: 400 });
            }

            const tokenAmount = Math.floor(amount * 1_000_000); // 6 decimals
            signature = await transferVinTokens(
                fromKeypair,
                fromTokenAccount.address,
                toTokenAccount.address,
                VIN_TOKEN_MINT_ADDRESS,
                tokenAmount,
                6
            );
        } else {
            return Response.json({ error: 'Invalid token type' }, { status: 400 });
        }

        console.log(`Transfer successful! Signature: ${signature}`);

        await base44.asServiceRole.entities.Transaction.create({
            user_id: user.id,
            sender_wallet: fromKeypair.publicKeyBase58,
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
        console.error('Error in transferTokens:', error);
        return Response.json({
            error: 'Transfer failed',
            details: error.message
        }, { status: 500 });
    }
});