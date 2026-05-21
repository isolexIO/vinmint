import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import {
    Connection,
    clusterApiUrl,
    Keypair,
    PublicKey,
    Transaction as SolanaTransaction
} from 'npm:@solana/web3.js@1.78.5';
import {
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction
} from 'npm:@solana/spl-token@0.3.8';

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

        // Get vault wallet secret key
        const VAULT_SECRET_KEY_STRING = Deno.env.get("VIN_VAULT_SECRET_KEY");
        if (!VAULT_SECRET_KEY_STRING) {
            throw new Error("VIN_VAULT_SECRET_KEY is not set in environment variables.");
        }
        const vaultKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(VAULT_SECRET_KEY_STRING)));
        
        const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
        const mintPublicKey = new PublicKey(VIN_TOKEN_MINT_ADDRESS);
        const recipientPublicKey = new PublicKey(recipient.wallet_address);

        // Get or create vault token account
        const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            vaultKeypair,
            mintPublicKey,
            vaultKeypair.publicKey
        );

        // Get or create recipient token account
        const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            vaultKeypair, // Payer for account creation
            mintPublicKey,
            recipientPublicKey
        );

        const transferAmount = amount * 1_000_000; // Convert to token units (6 decimals)

        // Create transfer instruction
        const transferInstruction = createTransferInstruction(
            vaultTokenAccount.address,
            recipientTokenAccount.address,
            vaultKeypair.publicKey,
            transferAmount
        );

        const transaction = new SolanaTransaction().add(transferInstruction);
        const signature = await connection.sendTransaction(transaction, [vaultKeypair]);
        await connection.confirmTransaction(signature, 'confirmed');

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

        // Log the distribution in Transaction entity
        await base44.asServiceRole.entities.Transaction.create({
            user_id: user.id,
            sender_wallet: vaultKeypair.publicKey.toBase58(),
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