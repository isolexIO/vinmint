
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import {
    Connection,
    clusterApiUrl,
    Keypair,
    PublicKey,
    Transaction as SolanaTransaction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from 'npm:@solana/web3.js@1.78.5';
import {
    getOrCreateAssociatedTokenAccount,
    createTransferCheckedInstruction, // Changed from createTransferInstruction
    getAccount,
    getAssociatedTokenAddress,
    TOKEN_2022_PROGRAM_ID
} from 'npm:@solana/spl-token@0.3.8';

const VIN_TOKEN_MINT_ADDRESS = "DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg";
const SOL_FEE_BUFFER = 0.00005;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.user_type !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
        }

        const { action, recipientAddress, amount, reason, tokenType } = await req.json();
        
        if (!action) {
            return Response.json({ error: 'Action is required (balance, distribute)' }, { status: 400 });
        }
        
        const vaultConfigs = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_vault' });
        if (vaultConfigs.length === 0 || !vaultConfigs[0].secret_key) {
            return Response.json({ error: 'VIN Vault is not configured.' }, { status: 404 });
        }
        
        let vaultKeypair;
        try {
            vaultKeypair = Keypair.fromSecretKey(new Uint8Array(vaultConfigs[0].secret_key));
        } catch (parseError) {
            return Response.json({ error: 'Invalid vault keypair.' }, { status: 500 });
        }
        
        const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
        const mintPublicKey = new PublicKey(VIN_TOKEN_MINT_ADDRESS);

        if (action === 'balance') {
            try {
                const solBalance = await connection.getBalance(vaultKeypair.publicKey) / LAMPORTS_PER_SOL;
                
                const associatedTokenAddress = await getAssociatedTokenAddress(
                    mintPublicKey, 
                    vaultKeypair.publicKey, 
                    false, 
                    TOKEN_2022_PROGRAM_ID
                );
                
                let vinBalance = 0;
                let hasTokenAccount = false;
                
                try {
                    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
                    if (accountInfo) {
                        const tokenAccount = await getAccount(connection, associatedTokenAddress, 'confirmed', TOKEN_2022_PROGRAM_ID);
                        vinBalance = Number(tokenAccount.amount) / 1_000_000;
                        hasTokenAccount = true;
                    }
                } catch (tokenError) {
                    console.warn("VIN token account not found:", tokenError.message);
                }
                
                return Response.json({
                    success: true,
                    vaultAddress: vaultKeypair.publicKey.toBase58(),
                    solBalance,
                    vinBalance,
                    hasTokenAccount,
                    tokenAccountAddress: associatedTokenAddress.toBase58()
                });
                
            } catch (balanceError) {
                return Response.json({
                    success: false,
                    error: 'Failed to fetch vault balance',
                    details: balanceError.message,
                }, { status: 500 });
            }
        }

        if (action === 'distribute') {
            if (!recipientAddress || !amount || amount <= 0 || !tokenType) {
                return Response.json({ error: 'Invalid distribution parameters' }, { status: 400 });
            }

            console.log(`=== DISTRIBUTION DEBUG ===`);
            console.log(`Amount requested: ${amount} ${tokenType}`);
            console.log(`Recipient: ${recipientAddress}`);
            console.log(`Vault: ${vaultKeypair.publicKey.toBase58()}`);

            try {
                const recipientPublicKey = new PublicKey(recipientAddress);
                const transaction = new SolanaTransaction();

                if (tokenType === 'SOL') {
                    const vaultSolBalance = await connection.getBalance(vaultKeypair.publicKey);
                    const requestedLamports = amount * LAMPORTS_PER_SOL;
                    const totalRequiredLamports = requestedLamports + (SOL_FEE_BUFFER * LAMPORTS_PER_SOL);

                    if (vaultSolBalance < totalRequiredLamports) {
                        return Response.json({ 
                            error: 'Insufficient SOL balance in vault',
                            available: vaultSolBalance / LAMPORTS_PER_SOL,
                            requested: amount,
                        }, { status: 400 });
                    }
                    
                    transaction.add(SystemProgram.transfer({
                        fromPubkey: vaultKeypair.publicKey,
                        toPubkey: recipientPublicKey,
                        lamports: requestedLamports,
                    }));

                } else if (tokenType === 'VIN') {
                    // Get the vault token account address
                    const vaultTokenAddress = await getAssociatedTokenAddress(
                        mintPublicKey, 
                        vaultKeypair.publicKey, 
                        false, 
                        TOKEN_2022_PROGRAM_ID
                    );
                    
                    console.log(`Vault token account: ${vaultTokenAddress.toBase58()}`);
                    
                    // Check if vault token account exists
                    const vaultAccountInfo = await connection.getAccountInfo(vaultTokenAddress);
                    if (!vaultAccountInfo) {
                        return Response.json({ 
                            error: 'Vault does not have a VIN token account',
                            tokenAccount: vaultTokenAddress.toBase58(),
                            suggestion: 'Send VIN tokens to the vault address first'
                        }, { status: 400 });
                    }
                    
                    // Get current balance
                    const vaultTokenAccount = await getAccount(connection, vaultTokenAddress, 'confirmed', TOKEN_2022_PROGRAM_ID);
                    const currentVinBalanceRaw = Number(vaultTokenAccount.amount);
                    const currentVinBalance = currentVinBalanceRaw / 1_000_000;
                    const requestedAmountRaw = BigInt(Math.floor(amount * 1_000_000));
                    
                    console.log(`Vault VIN balance: ${currentVinBalance} (${currentVinBalanceRaw} raw)`);
                    console.log(`Requested amount: ${amount} (${requestedAmountRaw} raw)`);
                    
                    if (currentVinBalanceRaw < Number(requestedAmountRaw)) {
                        return Response.json({ 
                            error: 'Vault has insufficient VIN tokens',
                            vaultBalance: currentVinBalance,
                            requestedAmount: amount,
                            difference: amount - currentVinBalance
                        }, { status: 400 });
                    }

                    // Get recipient token account (create if needed)
                    console.log(`Getting/creating recipient token account...`);
                    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
                        connection, 
                        vaultKeypair, 
                        mintPublicKey, 
                        recipientPublicKey, 
                        false, 
                        'confirmed', 
                        {}, 
                        TOKEN_2022_PROGRAM_ID
                    );
                    
                    console.log(`Recipient token account: ${recipientTokenAccount.address.toBase58()}`);
                    
                    // Create a 'transferChecked' instruction for Token-2022 with transfer fees
                    const transferInstruction = createTransferCheckedInstruction(
                        vaultTokenAddress,          // from (source token account)
                        mintPublicKey,              // mint (the token's mint public key)
                        recipientTokenAccount.address, // to (destination token account)
                        vaultKeypair.publicKey,     // owner (of the source token account)
                        requestedAmountRaw,         // amount (in raw units, e.g., 1_000_000 for 1 VIN)
                        6,                          // decimals (for VIN token, which has 6 decimals)
                        [],                         // multiSigners (empty array as no multi-sig is used)
                        TOKEN_2022_PROGRAM_ID       // program id (TOKEN_2022_PROGRAM_ID)
                    );
                    
                    transaction.add(transferInstruction);
                    console.log(`'transferChecked' instruction added for Token-2022`);
                } else {
                    return Response.json({ error: 'Invalid token type. Must be SOL or VIN.' }, { status: 400 });
                }

                // Get recent blockhash and set fee payer
                const { blockhash } = await connection.getLatestBlockhash('confirmed');
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = vaultKeypair.publicKey;
                
                console.log(`Transaction prepared, simulating...`);
                
                // Simulate transaction first
                try {
                    const simulationResult = await connection.simulateTransaction(transaction, [vaultKeypair]);
                    console.log(`Simulation result:`, JSON.stringify(simulationResult, null, 2));
                    
                    if (simulationResult.value.err) {
                        return Response.json({
                            error: 'Transaction simulation failed',
                            details: JSON.stringify(simulationResult.value.err),
                            logs: simulationResult.value.logs
                        }, { status: 400 });
                    }
                } catch (simError) {
                    console.error('Simulation error:', simError);
                    return Response.json({
                        error: 'Transaction simulation failed',
                        details: simError.message
                    }, { status: 400 });
                }
                
                console.log(`Simulation passed, sending transaction...`);
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [vaultKeypair], {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed'
                });
                
                console.log(`Transaction sent: ${signature}`);
                
                // Confirm transaction
                await connection.confirmTransaction(signature, 'confirmed');
                console.log(`Transaction confirmed: ${signature}`);

                // Record transaction
                await base44.asServiceRole.entities.Transaction.create({
                    user_id: user.id,
                    sender_wallet: vaultKeypair.publicKey.toBase58(),
                    receiver_wallet: recipientAddress,
                    token_type: tokenType,
                    amount: amount,
                    status: "completed",
                    transaction_hash: signature,
                    reason: reason || `Admin Distribution (${tokenType})`
                });

                if (tokenType === 'VIN') {
                    await base44.asServiceRole.entities.Reward.create({
                        recipient_id: user.id,
                        reward_type: 'admin_bonus',
                        amount: amount,
                        reason: reason || `Admin VIN distribution to ${recipientAddress}`,
                        transaction_hash: signature,
                        status: 'completed',
                        distributed_by: user.id
                    });
                }

                return Response.json({
                    success: true,
                    message: `Successfully distributed ${amount} ${tokenType} to ${recipientAddress}`,
                    transaction_hash: signature,
                });

            } catch (distributeError) {
                console.error("Distribution error:", distributeError);
                
                return Response.json({
                    success: false,
                    error: 'Token distribution failed',
                    details: distributeError.message,
                    stack: distributeError.stack
                }, { status: 500 });
            }
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Vault function error:', error);
        return Response.json({
            success: false,
            error: 'Vault operation failed',
            details: error.message
        }, { status: 500 });
    }
});
