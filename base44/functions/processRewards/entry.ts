// Backend function: processRewards
// Uses shared solanaWallet module (tweetnacl + raw RPC) instead of @solana/web3.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import {
    keypairFromSecretKey,
    transferVinTokens,
    getTokenAccountsByOwner
} from '../../shared/solanaWallet.ts';

const VIN_TOKEN_MINT_ADDRESS = "DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.user_type !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
        }

        const { rewardType, recipientId, amount, reason } = await req.json();

        if (!rewardType || !recipientId || !amount) {
            return Response.json({ error: 'Reward type, recipient ID, and amount are required' }, { status: 400 });
        }

        // Get recipient user
        const recipient = await base44.asServiceRole.entities.User.get(recipientId);
        if (!recipient || !recipient.wallet_address) {
            return Response.json({ error: 'Recipient not found or no wallet address' }, { status: 400 });
        }

        // Get vault wallet from SystemConfig
        const vaultConfigs = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_vault' });
        if (vaultConfigs.length === 0 || !vaultConfigs[0].secret_key) {
            return Response.json({ error: 'VIN Vault is not configured.' }, { status: 500 });
        }

        const vaultKeypair = keypairFromSecretKey(new Uint8Array(vaultConfigs[0].secret_key));

        // Find vault token account
        const vaultTokenAccount = await getTokenAccountsByOwner(vaultKeypair.publicKeyBase58, VIN_TOKEN_MINT_ADDRESS);
        if (!vaultTokenAccount) {
            return Response.json({
                error: 'Vault does not have a VIN token account. Send VIN tokens to the vault address first.',
                vault_address: vaultKeypair.publicKeyBase58
            }, { status: 400 });
        }

        // Find recipient token account
        const recipientTokenAccount = await getTokenAccountsByOwner(recipient.wallet_address, VIN_TOKEN_MINT_ADDRESS);
        if (!recipientTokenAccount) {
            return Response.json({
                error: `Recipient does not have a VIN token account. They need to receive VIN tokens first.`,
                recipient: recipient.wallet_address
            }, { status: 400 });
        }

        const transferAmount = Math.floor(amount * 1_000_000); // 6 decimals

        const signature = await transferVinTokens(
            vaultKeypair,
            vaultTokenAccount.address,
            recipientTokenAccount.address,
            VIN_TOKEN_MINT_ADDRESS,
            transferAmount,
            6
        );

        // Create reward record
        await base44.asServiceRole.entities.Reward.create({
            recipient_id: recipientId,
            reward_type: rewardType,
            amount: amount,
            reason: reason,
            transaction_hash: signature,
            status: 'completed',
            distributed_by: user.id
        });

        await base44.asServiceRole.entities.Transaction.create({
            user_id: user.id,
            sender_wallet: vaultKeypair.publicKeyBase58,
            receiver_wallet: recipient.wallet_address,
            token_type: "VIN",
            amount: amount,
            status: "completed",
            transaction_hash: signature,
            reason: `${rewardType}: ${reason}`
        });

        return Response.json({
            success: true,
            message: `Reward of ${amount} $VIN distributed successfully`,
            recipient: recipient.full_name,
            transaction_hash: signature
        });

    } catch (error) {
        console.error('Error processing reward:', error);
        return Response.json({
            success: false,
            error: 'Reward processing failed',
            details: error.message
        }, { status: 500 });
    }
});