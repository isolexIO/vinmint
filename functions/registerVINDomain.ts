
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

// Real NFT minting function
const mintRealNFT = async (connection, payerKeypair, recipientWallet, metadata) => {
    try {
        console.log('Starting real NFT mint process...');
        
        // Create a new mint for the NFT
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
                mintKeypair.publicKey,
                recipientTokenAccount,
                payerKeypair.publicKey,
                1, // amount (1 for NFT)
                [],
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
        
        console.log(`NFT minted successfully! Token: ${mintKeypair.publicKey.toBase58()}, Tx: ${signature}`);
        
        return {
            tokenId: mintKeypair.publicKey.toBase58(),
            txHash: signature,
            success: true
        };
        
    } catch (error) {
        console.error('Real NFT minting failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

Deno.serve(async (req) => {
    // Declare variables at function root
    let domainNftTokenId;
    let mintTxHash;
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vin, vehicleData } = await req.json();

        console.log(`VIN registration request for: ${vin} by user: ${user.id}`);

        // Step 1: Check if VIN already exists (prevent duplicates)
        const existingVehicles = await base44.entities.Vehicle.filter({ vin: vin.toUpperCase() });
        if (existingVehicles.length > 0) {
            console.warn(`VIN ${vin} already registered`);
            return Response.json({
                success: false,
                error: 'This VIN is already registered in the system.',
                existing_vehicle: existingVehicles[0]
            }, { status: 400 });
        }

        // Step 2: Create .VINmint domain
        const domain = `${vin.toUpperCase()}.VINmint`;
        
        // Step 3: Validate wallet address format
        let ownerWallet = vehicleData.owner_wallet;
        if (!ownerWallet) {
            ownerWallet = user.wallet_address;
        }

        if (!ownerWallet) {
            return Response.json({
                success: false,
                error: 'No valid wallet address found. Please ensure your profile has a wallet address.'
            }, { status: 400 });
        }

        try {
            new PublicKey(ownerWallet);
        } catch (e) {
            return Response.json({
                success: false,
                error: 'Invalid Solana wallet address format.',
                address: ownerWallet
            }, { status: 400 });
        }

        // Step 4: Calculate registration fee
        const vinTokenPrice = 0.10; // $0.10 per VIN token
        const registrationFeeUSD = 49.00; // $49 registration fee
        const registrationFeeVIN = registrationFeeUSD / vinTokenPrice; // 490 VIN tokens

        // For customers (vehicle_owners), check if they have sufficient VIN balance
        if (user.user_type === 'vehicle_owner') {
            const currentBalance = user.vin_token_balance || 0;
            if (currentBalance < registrationFeeVIN) {
                return Response.json({
                    success: false,
                    error: `Insufficient VIN token balance. You need ${registrationFeeVIN} VIN tokens (${registrationFeeUSD} USD) for VIN registration. Current balance: ${currentBalance} VIN`,
                    required_balance: registrationFeeVIN,
                    current_balance: currentBalance
                }, { status: 402 });
            }
        }

        // Step 5: Connect to Solana mainnet and mint real NFT
        const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
        
        // Get VIN Vault configuration instead of environment variable
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
            
            const nftMetadata = {
                name: `${domain} Vehicle Registration`,
                description: `Official VIN registration NFT for ${vin} on VINmint`,
                image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg",
                attributes: [
                    { trait_type: "VIN", value: vin },
                    { trait_type: "Domain", value: domain },
                    { trait_type: "Vehicle", value: `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}` },
                    { trait_type: "Registration Date", value: new Date().toISOString() }
                ]
            };
            
            mintResult = await mintRealNFT(connection, vaultKeypair, ownerWallet, nftMetadata);
            
            if (!mintResult.success) {
                throw new Error(mintResult.error || 'On-chain minting failed.');
            }
            
            domainNftTokenId = mintResult.tokenId;
            mintTxHash = mintResult.txHash;
            console.log(`Real NFT minted: ${domainNftTokenId}, Tx: ${mintTxHash}`);

        } catch (systemWalletError) {
            console.error("Real NFT minting process failed:", systemWalletError);
            return Response.json({
                success: false,
                error: 'Failed to mint the NFT on the blockchain. No tokens were deducted.',
                details: systemWalletError.message
            }, { status: 500 });
        }
        
        // --- All operations below only execute if the blockchain mint was successful ---

        // Step 6: Generate invoice for VIN registration
        const invoiceNumber = generateInvoiceNumber();
        const invoice = await base44.asServiceRole.entities.Invoice.create({
            customer_id: user.id,
            customer_email: user.email,
            invoice_number: invoiceNumber,
            invoice_type: 'vin_registration',
            description: `VIN Registration - ${domain}`,
            item_reference: vin.toUpperCase(),
            amount_vin: registrationFeeVIN,
            amount_usd: registrationFeeUSD,
            discount_applied: 0,
            final_amount_vin: registrationFeeVIN,
            payment_status: 'paid',
            payment_date: new Date().toISOString(),
            transaction_hash: mintTxHash,
            customer_type: user.user_type
        });

        // Step 7: Create the vehicle record
        const newVehicleData = {
            ...vehicleData,
            vin: vin.toUpperCase(),
            domain: domain,
            owner_wallet: ownerWallet,
            domain_nft_token_id: domainNftTokenId,
            invoice_id: invoice.id,
            dealer_id: user.user_type === 'dealer' ? user.id : undefined
        };

        const vehicle = await base44.entities.Vehicle.create(newVehicleData);

        // Step 8: Update user's VIN token balance (for vehicle owners)
        if (user.user_type === 'vehicle_owner') {
            const newBalance = (user.vin_token_balance || 0) - registrationFeeVIN;
            await base44.asServiceRole.entities.User.update(user.id, {
                vin_token_balance: Math.max(0, newBalance)
            });
        }

        // Step 9: Create real notification
        await base44.asServiceRole.entities.Notification.create({
            user_id: user.id,
            message: `Your VIN ${vin} has been successfully registered as ${domain} and minted as an NFT!`,
            type: 'nft_mint',
            link_to: `https://solscan.io/token/${domainNftTokenId}`
        });

        console.log(`VIN ${vin} successfully registered as ${domain}`);

        return Response.json({
            success: true,
            message: 'VIN domain registered successfully',
            vehicle: vehicle,
            domain: domain,
            domain_nft_token_id: domainNftTokenId,
            transaction_hash: mintTxHash,
            invoice: {
                number: invoiceNumber,
                amount_vin: registrationFeeVIN,
                amount_usd: registrationFeeUSD
            },
            real_nft: true
        });

    } catch (error) {
        console.error('Error registering VIN domain:', error);
        return Response.json({ 
            success: false,
            error: 'Failed to register VIN domain', 
            details: error.message 
        }, { status: 500 });
    }
});
