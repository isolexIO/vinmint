// Backend function: purchaseVinTokens
// Allows users to buy VIN tokens by sending SOL to the vault.
// The exchange rate (VIN per SOL) is admin-controlled via SystemConfig.
// Flow: transfer SOL (user→vault) → verify tx → create user ATA if needed → transfer VIN (vault→user)
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import {
    keypairFromSecretKey,
    isValidPublicKey,
    transferSol,
    transferVinTokensWithATA,
    getTokenAccountsByOwner,
    getAssociatedTokenAddress,
    confirmTransaction,
    getBalance,
} from '../../shared/solanaWallet.ts';

const VIN_TOKEN_MINT_ADDRESS = "DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.wallet_address) {
            return Response.json({ error: 'Wallet required to purchase tokens' }, { status: 401 });
        }

        const { action, solAmount } = await req.json();

        // --- Get current exchange rate (public to authenticated users) ---
        if (action === 'getRate') {
            const rateConfig = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_purchase_rate' });
            const vaultConfig = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_vault' });

            const rate = rateConfig.length > 0 ? parseFloat(rateConfig[0].description || '0') : 0;
            const vaultAddress = vaultConfig.length > 0 ? vaultConfig[0].public_key : null;

            return Response.json({
                success: true,
                rate, // VIN tokens per 1 SOL
                vaultAddress,
                isConfigured: rate > 0 && !!vaultAddress,
            });
        }

        // --- Purchase VIN tokens ---
        if (action === 'purchase' || !action) {
            if (!solAmount || solAmount <= 0) {
                return Response.json({ error: 'A positive SOL amount is required' }, { status: 400 });
            }

            // Get exchange rate
            const rateConfig = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_purchase_rate' });
            if (rateConfig.length === 0 || !rateConfig[0].description) {
                return Response.json({ error: 'Purchase rate is not configured. Please contact an admin.' }, { status: 503 });
            }
            const rate = parseFloat(rateConfig[0].description);
            if (rate <= 0) {
                return Response.json({ error: 'Invalid exchange rate configured' }, { status: 503 });
            }

            const vinAmount = solAmount * rate;

            // Get vault config
            const vaultConfigs = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_vault' });
            if (vaultConfigs.length === 0 || !vaultConfigs[0].public_key || !vaultConfigs[0].secret_key) {
                return Response.json({ error: 'VIN Vault is not configured' }, { status: 503 });
            }
            const vaultConfig = vaultConfigs[0];
            const vaultAddress = vaultConfig.public_key;
            const vaultKeypair = keypairFromSecretKey(new Uint8Array(vaultConfig.secret_key));

            // Get user wallet keypair
            const userData = await base44.asServiceRole.entities.User.get(user.id);
            if (!userData.wallet_secret_key) {
                return Response.json({ error: 'Your wallet is not fully configured' }, { status: 400 });
            }
            const userKeypair = keypairFromSecretKey(new Uint8Array(userData.wallet_secret_key));

            // Check user has enough SOL (amount + ~0.01 for fees)
            const userSolBalance = await getBalance(user.wallet_address);
            if (userSolBalance < solAmount + 0.01) {
                return Response.json({
                    error: `Insufficient SOL. You need at least ${(solAmount + 0.01).toFixed(4)} SOL (including fees) but have ${userSolBalance.toFixed(4)} SOL.`
                }, { status: 400 });
            }

            // Check vault has enough VIN tokens
            const vaultTokenAccount = await getTokenAccountsByOwner(vaultAddress, VIN_TOKEN_MINT_ADDRESS);
            if (!vaultTokenAccount) {
                return Response.json({ error: 'Vault does not have a VIN token account' }, { status: 503 });
            }
            const vaultVinBalance = vaultTokenAccount.amount / Math.pow(10, vaultTokenAccount.decimals);
            if (vaultVinBalance < vinAmount) {
                return Response.json({
                    error: `Vault has insufficient VIN tokens. Available: ${vaultVinBalance}, Requested: ${vinAmount}`
                }, { status: 503 });
            }

            // Step 1: Transfer SOL from user to vault
            console.log(`Purchase: transferring ${solAmount} SOL from ${user.wallet_address} to vault ${vaultAddress}`);
            const solSignature = await transferSol(userKeypair, vaultAddress, solAmount);

            // Step 2: Verify the SOL transfer was confirmed on-chain
            const solConfirmed = await confirmTransaction(solSignature, 15);
            if (!solConfirmed) {
                // Record the failed purchase attempt
                await base44.asServiceRole.entities.Transaction.create({
                    user_id: user.id,
                    sender_wallet: user.wallet_address,
                    receiver_wallet: vaultAddress,
                    token_type: 'SOL',
                    amount: solAmount,
                    status: 'failed',
                    transaction_hash: solSignature,
                });
                return Response.json({
                    error: 'SOL transfer could not be confirmed on-chain. Please try again or contact support.',
                    solSignature,
                }, { status: 500 });
            }

            // Step 3: Get or create user's token account, then transfer VIN from vault to user
            let userTokenAccount = await getTokenAccountsByOwner(user.wallet_address, VIN_TOKEN_MINT_ADDRESS);
            const tokenAmount = Math.floor(vinAmount * 1_000_000);

            let vinSignature: string;
            if (userTokenAccount) {
                // User already has a token account — simple transfer
                vinSignature = await transferVinTokensWithATA(
                    vaultKeypair,
                    vaultTokenAccount.address,
                    user.wallet_address,
                    userTokenAccount.address,
                    VIN_TOKEN_MINT_ADDRESS,
                    tokenAmount,
                    6
                );
            } else {
                // User doesn't have a token account — compute ATA and create it in the same tx
                const userAta = await getAssociatedTokenAddress(user.wallet_address, VIN_TOKEN_MINT_ADDRESS);
                vinSignature = await transferVinTokensWithATA(
                    vaultKeypair,
                    vaultTokenAccount.address,
                    user.wallet_address,
                    userAta,
                    VIN_TOKEN_MINT_ADDRESS,
                    tokenAmount,
                    6
                );
            }

            // Step 4: Record transactions
            await base44.asServiceRole.entities.Transaction.create({
                user_id: user.id,
                sender_wallet: user.wallet_address,
                receiver_wallet: vaultAddress,
                token_type: 'SOL',
                amount: solAmount,
                status: 'completed',
                transaction_hash: solSignature,
            });

            await base44.asServiceRole.entities.Transaction.create({
                user_id: user.id,
                sender_wallet: vaultAddress,
                receiver_wallet: user.wallet_address,
                token_type: 'VIN',
                amount: vinAmount,
                status: 'completed',
                transaction_hash: vinSignature,
            });

            // Step 5: Notify user
            await base44.asServiceRole.entities.Notification.create({
                user_id: user.id,
                message: `Successfully purchased ${vinAmount.toLocaleString()} VIN tokens for ${solAmount} SOL.`,
                type: 'transaction',
                link_to: '/Wallet',
            });

            console.log(`Purchase complete: ${solAmount} SOL → ${vinAmount} VIN for user ${user.id}`);

            return Response.json({
                success: true,
                message: `Successfully purchased ${vinAmount} VIN tokens`,
                solAmount,
                vinAmount,
                rate,
                solSignature,
                vinSignature,
                solscanUrl: `https://solscan.io/tx/${vinSignature}`,
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error in purchaseVinTokens:', error);
        return Response.json({
            success: false,
            error: 'Purchase failed',
            details: error.message,
        }, { status: 500 });
    }
});