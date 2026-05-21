
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from 'npm:@solana/web3.js@1.78.5';
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID
} from 'npm:@solana/spl-token@0.3.8';

const connection = new Connection('https://api.mainnet-beta.solana.com');

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

        // Get user's wallet keypair (in a real app, this would be handled more securely)
        const userWalletData = await base44.asServiceRole.entities.User.get(user.id);
        if (!userWalletData.wallet_secret_key) {
            return Response.json({ error: 'User wallet secret key not found' }, { status: 400 });
        }

        const userKeypair = Keypair.fromSecretKey(new Uint8Array(userWalletData.wallet_secret_key));

        // VIN Token mint address (this would be the actual VIN token mint on mainnet)
        // For demo purposes, we'll simulate this
        const VIN_TOKEN_MINT = new PublicKey('VINTokenMintAddress123456789'); // Replace with actual mint

        // Get associated token accounts
        const userTokenAccount = await getAssociatedTokenAddress(
            VIN_TOKEN_MINT,
            userKeypair.publicKey
        );

        const vaultTokenAccount = await getAssociatedTokenAddress(
            VIN_TOKEN_MINT,
            new PublicKey(vinVaultAddress)
        );

        // Create transfer transaction
        const transaction = new Transaction();

        // Convert VIN amount to token units (assuming 6 decimals for VIN token)
        const tokenAmount = Math.floor(amount_vin * 1000000);

        transaction.add(
            createTransferInstruction(
                userTokenAccount,    // source
                vaultTokenAccount,   // destination
                userKeypair.publicKey, // owner
                tokenAmount          // amount
            )
        );

        // Send transaction
        const signature = await connection.sendTransaction(transaction, [userKeypair], {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed'
        });

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

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

        // Create a notification for the user
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
