
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { 
    Connection, 
    PublicKey, 
    clusterApiUrl,
    Keypair,
    Transaction,
    SystemProgram
} from 'npm:@solana/web3.js@1.78.5';
import {
    createMint,
    createAssociatedTokenAccount,
    mintTo,
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createMintToInstruction
} from 'npm:@solana/spl-token@0.3.8';

// Generate invoice number
const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    return `INV-${year}${month}-${timestamp}`;
};

// Real service NFT minting function
const mintServiceNFT = async (connection, payerKeypair, recipientWallet, serviceData, vehicleData) => {
    try {
        console.log('Starting real service NFT mint process...');
        
        // Create a new mint for the service NFT
        const mintKeypair = Keypair.generate();
        
        // Get minimum balance for rent exemption
        const mintRentExempt = await connection.getMinimumBalanceForRentExemption(82);
        
        const transaction = new Transaction();
        
        // Create mint account
        transaction.add(
            SystemProgram.createAccount({
                fromPubkey: payerKeypair.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                lamports: mintRentExempt,
                space: 82,
                programId: TOKEN_2022_PROGRAM_ID,
            })
        );
        
        // Initialize mint
        transaction.add(
            createInitializeMintInstruction(
                mintKeypair.publicKey,
                0, // decimals (0 for NFT)
                payerKeypair.publicKey, // mint authority
                null, // freeze authority
                TOKEN_2022_PROGRAM_ID
            )
        );
        
        // Create associated token account for recipient
        const recipientTokenAccount = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            new PublicKey(recipientWallet),
            false,
            TOKEN_2022_PROGRAM_ID
        );
        
        transaction.add(
            createAssociatedTokenAccountInstruction(
                payerKeypair.publicKey, // payer
                recipientTokenAccount, // associated token account
                new PublicKey(recipientWallet), // owner
                mintKeypair.publicKey, // mint
                TOKEN_2022_PROGRAM_ID
            )
        );
        
        // Mint NFT to recipient
        transaction.add(
            createMintToInstruction(
                mintKeypair.publicKey, // mint
                recipientTokenAccount, // destination
                payerKeypair.publicKey, // authority
                1, // amount (1 for NFT)
                [], // multiSigners
                TOKEN_2022_PROGRAM_ID
            )
        );
        
        // Sign and send transaction
        const signature = await connection.sendTransaction(
            transaction, 
            [payerKeypair, mintKeypair],
            { commitment: 'confirmed' }
        );
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        console.log(`Service NFT minted successfully! Token: ${mintKeypair.publicKey.toBase58()}, Tx: ${signature}`);
        
        return {
            tokenId: mintKeypair.publicKey.toBase58(),
            txHash: signature,
            success: true
        };
        
    } catch (error) {
        console.error('Real service NFT minting failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

Deno.serve(async (req) => {
    // Declare variables at function root
    let nftTokenId;
    let txHash;
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { serviceRecordId, recipientAddress } = await req.json();

        // Get the service record
        const serviceRecord = await base44.asServiceRole.entities.ServiceRecord.get(serviceRecordId);
        if (!serviceRecord) {
            return Response.json({ error: 'Service record not found' }, { status: 404 });
        }
        
        if (serviceRecord.nft_token_id) {
            return Response.json({ error: 'This service record has already been minted as an NFT.' }, { status: 400 });
        }

        // Get the associated vehicle to find the owner
        const vehicle = await base44.asServiceRole.entities.Vehicle.get(serviceRecord.vehicle_id);
        if (!vehicle) {
            return Response.json({ error: 'Associated vehicle not found' }, { status: 404 });
        }

        // Use recipient address or default to vehicle owner
        const targetWallet = recipientAddress || vehicle.owner_wallet;
        if (!targetWallet) {
            return Response.json({ error: 'No valid recipient address available' }, { status: 400 });
        }

        // Validate the wallet address
        try {
            new PublicKey(targetWallet);
        } catch (e) {
            return Response.json({ 
                error: 'Invalid Solana wallet address format.', 
                address: targetWallet,
                details: e.message 
            }, { status: 400 });
        }

        // Get vehicle owner details for invoice
        const allUsers = await base44.asServiceRole.entities.User.list();
        const vehicleOwner = allUsers.find(u => u.wallet_address === vehicle.owner_wallet);

        if (!vehicleOwner) {
            return Response.json({ error: 'Vehicle owner not found in system' }, { status: 404 });
        }

        // Calculate NFT minting fee in VIN tokens
        const vinTokenPrice = 0.10; // $0.10 per VIN token
        const mintFeeUSD = 1.00; // $1.00 minting fee
        const nftFeeVIN = mintFeeUSD / vinTokenPrice; // 10 VIN tokens

        // Check if vehicle owner has sufficient balance
        const currentBalance = vehicleOwner.vin_token_balance || 0;
        if (currentBalance < nftFeeVIN) {
            return Response.json({
                error: `Insufficient VIN token balance. Vehicle owner needs ${nftFeeVIN} VIN tokens for NFT minting. Current balance: ${currentBalance} VIN`,
                required_balance: nftFeeVIN,
                current_balance: currentBalance
            }, { status: 402 });
        }

        // Connect to Solana mainnet and mint real NFT
        const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
        
        // Get VIN Vault configuration
        const vaultConfigs = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_vault' });
        if (vaultConfigs.length === 0 || !vaultConfigs[0].secret_key) {
            console.error("VIN Vault is not configured. Cannot mint real NFT.");
            return Response.json({ 
                error: 'VIN Vault is not configured. Please configure the vault in the Admin Panel first.',
                action_needed: 'Go to Admin Panel → VIN Vault Management → Generate Vault Wallet'
            }, { status: 500 });
        }

        let mintResult;
        try {
            const vaultKeypair = Keypair.fromSecretKey(new Uint8Array(vaultConfigs[0].secret_key));
            
            // Check vault balance before attempting transaction
            const vaultBalance = await connection.getBalance(vaultKeypair.publicKey);
            // Estimate required balance for transaction fees, typically 0.000005 to 0.002 SOL
            // A conservative estimate for complex transactions or account creation might be higher.
            // 0.002 SOL is a safe upper bound for a single NFT mint.
            const requiredBalance = 0.002 * 1_000_000_000; // 0.002 SOL in lamports
            
            if (vaultBalance < requiredBalance) {
                return Response.json({
                    error: 'VIN Vault has insufficient SOL for transaction fees.',
                    details: `Vault needs at least 0.002 SOL but has ${(vaultBalance / 1_000_000_000).toFixed(6)} SOL`,
                    vault_address: vaultKeypair.publicKey.toBase58(),
                    action_needed: 'Fund the VIN Vault wallet with SOL through the Admin Panel → VIN Vault Management → Fund Wallet'
                }, { status: 402 });
            }
            
            mintResult = await mintServiceNFT(connection, vaultKeypair, targetWallet, serviceRecord, vehicle);

            if (!mintResult.success) {
                throw new Error(mintResult.error || 'On-chain minting failed.');
            }
            nftTokenId = mintResult.tokenId;
            txHash = mintResult.txHash;
            console.log(`Real service NFT minted: ${nftTokenId}, Tx: ${txHash}`);
        } catch (mintingError) {
            console.error("Real NFT minting process failed:", mintingError);
            
            // Enhanced error handling for common blockchain issues
            let errorMessage = 'Failed to mint the NFT on the blockchain. No tokens were deducted.';
            let actionNeeded = null;
            
            if (mintingError.message.includes('insufficient funds for rent') || mintingError.message.includes('insufficient lamports')) {
                errorMessage = 'VIN Vault has insufficient SOL to pay for blockchain transaction fees or account creation rent.';
                actionNeeded = 'Please fund the VIN Vault wallet with SOL through Admin Panel → VIN Vault Management → Fund Wallet';
            } else if (mintingError.message.includes('blockhash not found') || mintingError.message.includes('Transaction simulation failed')) {
                errorMessage = 'Network congestion or transient issue detected. Please try again in a few moments.';
            } else if (mintingError.message.includes('Transaction was not confirmed')) {
                errorMessage = 'Transaction timeout due to network congestion or high load. Please try again.';
            }
            
            return Response.json({ 
                error: errorMessage,
                details: mintingError.message,
                action_needed: actionNeeded
            }, { status: 500 });
        }

        // --- All operations below only execute if the blockchain mint was successful ---

        // Generate invoice for NFT minting
        const invoiceNumber = generateInvoiceNumber();
        const invoice = await base44.asServiceRole.entities.Invoice.create({
            customer_id: vehicleOwner.id,
            customer_email: vehicleOwner.email,
            invoice_number: invoiceNumber,
            invoice_type: 'service_nft',
            description: `Service NFT Minting - ${serviceRecord.service_type.replace(/_/g, ' ')} at ${serviceRecord.shop_name}`,
            item_reference: serviceRecord.id,
            amount_vin: nftFeeVIN,
            amount_usd: mintFeeUSD,
            discount_applied: 0,
            final_amount_vin: nftFeeVIN,
            payment_status: 'paid',
            payment_date: new Date().toISOString(),
            transaction_hash: txHash,
            customer_type: vehicleOwner.user_type
        });

        // Create NFT metadata
        const nftMetadata = {
            name: `Service Record NFT - ${serviceRecord.service_type.replace(/_/g, ' ')}`,
            description: `Service record for ${vehicle.vin} performed at ${serviceRecord.shop_name}`,
            image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg",
            attributes: [
                { trait_type: "Service Type", value: serviceRecord.service_type.replace(/_/g, ' ') },
                { trait_type: "Vehicle VIN", value: vehicle.vin },
                { trait_type: "Shop Name", value: serviceRecord.shop_name },
                { trait_type: "Service Date", value: serviceRecord.created_date },
                { trait_type: "Mileage", value: serviceRecord.mileage_at_service?.toString() || "Not recorded" },
                { trait_type: "Minting Fee", value: `${nftFeeVIN} VIN ($${mintFeeUSD} USD)` }
            ]
        };

        // Update the service record with NFT information
        const updatedServiceRecord = await base44.asServiceRole.entities.ServiceRecord.update(serviceRecordId, {
            nft_token_id: nftTokenId,
            nft_tx_hash: txHash,
            nft_recipient: targetWallet,
            nft_metadata: nftMetadata,
            nft_minted_date: new Date().toISOString(),
            nft_chain: "Solana",
            invoice_id: invoice.id
        });

        // Update vehicle owner's VIN balance
        const newBalance = currentBalance - nftFeeVIN;
        await base44.asServiceRole.entities.User.update(vehicleOwner.id, {
            vin_token_balance: Math.max(0, newBalance)
        });

        // Create real notification for NFT recipient
        await base44.asServiceRole.entities.Notification.create({
            user_id: vehicleOwner.id,
            message: `Your service record for ${vehicle.vin} has been minted as an NFT and sent to your wallet!`,
            type: 'nft_mint',
            link_to: `https://solscan.io/token/${nftTokenId}`
        });

        return Response.json({
            success: true,
            message: 'Service NFT minted successfully',
            nft_token_id: nftTokenId,
            transaction_hash: txHash,
            recipient: targetWallet,
            metadata: nftMetadata,
            invoice: {
                number: invoiceNumber,
                amount_vin: nftFeeVIN,
                amount_usd: mintFeeUSD
            },
            serviceRecord: updatedServiceRecord,
            real_nft: true
        });

    } catch (error) {
        console.error('Error minting service NFT:', error);
        return Response.json({ 
            error: 'Failed to mint NFT', 
            details: error.message 
        }, { status: 500 });
    }
});
