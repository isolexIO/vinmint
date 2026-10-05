// Backend function: processVinVaultPayment
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

        if (!user || !user.wallet_address) {
            return Response.json({ error: 'User wallet required' }, { status: 401 });
        }

        const { amount_vin, payment_type, reference_id, description } = await req.json();

        if (!amount_vin || amount_vin <= 0) {
            return Response.json({ error: 'Invalid payment amount' }, { status: 400 });
        }

        // Get VIN Vault configuration
        const vinVaultConfig = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_vault' });
        if (vinVaultConfig.length === 0) {
            return Response.json({ error: 'VIN Vault not configured' }, { status: 500 });
        }

        const vaultConfig = vinVaultConfig[0];
        const vinVaultAddress = vaultConfig.public_key;

        // Get user's wallet keypair
        const userWalletData = await base44.asServiceRole.entities.User.get(user.id);
        if (!userWalletData.wallet_secret_key) {
            return Response.json({ error: 'User wallet secret key not found' }, { status: 400 });
        }

        const userKeypair = keypairFromSecretKey(new Uint8Array(userWalletData.wallet_secret_key));

        // Find user's token account
        const userTokenAccount = await getTokenAccountsByOwner(user.wallet_address, VIN_TOKEN_MINT_ADDRESS);
        if (!userTokenAccount) {
            return Response.json({
                error: 'You do not have a VIN token account. Please receive VIN tokens first.',
            }, { status: 400 });
        }

        // Find vault's token account
        const vaultTokenAccount = await getTokenAccountsByOwner(vinVaultAddress, VIN_TOKEN_MINT_ADDRESS);
        if (!vaultTokenAccount) {
            return Response.json({
                error: 'VIN Vault does not have a VIN token account.',
                vault_address: vinVaultAddress
            }, { status: 400 });
        }

        const tokenAmount = Math.floor(amount_vin * 1_000_000);

        const signature = await transferVinTokens(
            userKeypair,
            userTokenAccount.address,
            vaultTokenAccount.address,
            VIN_TOKEN_MINT_ADDRESS,
            tokenAmount,
            6
        );

        // Update user's VIN balance
        const newBalance = (userWalletData.vin_token_balance || 0) - amount_vin;
        await base44.asServiceRole.entities.User.update(user.id, {
            vin_token_balance: Math.max(0, newBalance)
        });

        // Create transaction record
        const transactionRecord = await base44.asServiceRole.entities.Transaction.create({
            user_id: user.id,
            sender_wallet: user.wallet_address,
            receiver_wallet: vinVaultAddress,
            token_type: 'VIN',
            amount: amount_vin,
            status: 'completed',
            transaction_hash: signature
        });

        await base44.asServiceRole.entities.Notification.create({
            user_id: user.id,
            message: `Your payment of ${amount_vin} VIN to the VIN Vault was successful.`,
            type: 'transaction',
            link_to: `/Wallet`
        });

        console.log(`VIN Vault payment processed: ${amount_vin} VIN from ${user.wallet_address}`);

        return Response.json({
            success: true,
            message: 'Payment successfully processed to VIN Vault',
            transaction_hash: signature,
            amount_vin: amount_vin,
            new_balance: newBalance,
            vault_address: vinVaultAddress,
            transaction_id: transactionRecord.id,
            solscan_url: `https://solscan.io/tx/${signature}`
        });

    } catch (error) {
        console.error('Error processing VIN Vault payment:', error);
        return Response.json({
            success: false,
            error: 'Failed to process payment to VIN Vault',
            details: error.message
        }, { status: 500 });
    }
});