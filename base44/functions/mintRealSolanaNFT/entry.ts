
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
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint
} from 'npm:@solana/spl-token@0.3.8';

const connection = new Connection('https://api.mainnet-beta.solana.com');

// Generate invoice number
const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    return `INV-${year}${month}-${timestamp}`;
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { serviceRecordId, recipientAddress, nftMetadata } = await req.json();

        // Get the service record
        const serviceRecord = await base44.asServiceRole.entities.ServiceRecord.get(serviceRecordId);
        if (!serviceRecord) {
            return Response.json({ error: 'Service record not found' }, { status: 404 });
        }

        // Get VIN Vault configuration for minting authority
        const vinVaultConfig = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_vault' });
        if (vinVaultConfig.length === 0) {
            return Response.json({ error: 'VIN Vault not configured' }, { status: 500 });
        }

        const vaultConfig = vinVaultConfig[0];
        const mintAuthority = Keypair.fromSecretKey(new Uint8Array(vaultConfig.secret_key));

        // Create new mint account for the NFT
        const mint = Keypair.generate();
        
        // Calculate rent for mint account
        const rentExemption = await getMinimumBalanceForRentExemptMint(connection);

        // Get associated token account for recipient
        const recipientTokenAccount = await getAssociatedTokenAddress(
            mint.publicKey,
            new PublicKey(recipientAddress)
        );

        // Create transaction
        const transaction = new Transaction();

        // Create mint account
        transaction.add(
            SystemProgram.createAccount({
                fromPubkey: mintAuthority.publicKey,
                newAccountPubkey: mint.publicKey,
                lamports: rentExemption,
                space: MINT_SIZE,
                programId: TOKEN_PROGRAM_ID
            })
        );

        // Initialize mint (NFT has decimals = 0, supply = 1)
        transaction.add(
            createInitializeMintInstruction(
                mint.publicKey,
                0, // decimals
                mintAuthority.publicKey, // mint authority
                mintAuthority.publicKey  // freeze authority
            )
        );

        // Create associated token account for recipient
        transaction.add(
            createAssociatedTokenAccountInstruction(
                mintAuthority.publicKey, // payer
                recipientTokenAccount,    // associated token account
                new PublicKey(recipientAddress), // owner
                mint.publicKey           // mint
            )
        );

        // Mint 1 token to recipient (creating the NFT)
        transaction.add(
            createMintToInstruction(
                mint.publicKey,
                recipientTokenAccount,
                mintAuthority.publicKey,
                1 // amount (1 for NFT)
            )
        );

        // Send and confirm transaction
        const signature = await connection.sendTransaction(transaction, [mintAuthority, mint], {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed'
        });

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        // Calculate minting fee
        const mintFeeUSD = 1.00; // $1 USD
        const vinTokenPrice = 0.10; // $0.10 per VIN token
        const mintFeeVIN = mintFeeUSD / vinTokenPrice; // 10 VIN tokens

        // Create invoice for NFT minting
        const invoiceNumber = generateInvoiceNumber();
        const invoice = await base44.asServiceRole.entities.Invoice.create({
            customer_id: serviceRecord.shop_id, // Shop pays for minting
            customer_email: user.email,
            invoice_number: invoiceNumber,
            invoice_type: 'service_nft',
            description: `Service Record NFT Minting - ${serviceRecord.service_type}`,
            item_reference: serviceRecord.id,
            amount_vin: mintFeeVIN,
            amount_usd: mintFeeUSD,
            discount_applied: 0,
            final_amount_vin: mintFeeVIN,
            payment_status: 'paid',
            payment_date: new Date().toISOString(),
            transaction_hash: signature
        });

        // Prepare NFT metadata
        const metadata = {
            name: `VINmint Service Record - ${serviceRecord.service_type}`,
            symbol: 'VINSR',
            description: `Official service record NFT for ${serviceRecord.service_details}`,
            image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg',
            external_url: `https://vinmint.app/service/${serviceRecord.id}`,
            attributes: [
                { trait_type: 'Service Type', value: serviceRecord.service_type },
                { trait_type: 'Shop Name', value: serviceRecord.shop_name },
                { trait_type: 'VIN', value: serviceRecord.vin },
                { trait_type: 'Service Date', value: serviceRecord.created_date.split('T')[0] },
                { trait_type: 'Mileage', value: serviceRecord.mileage_at_service?.toString() || 'Not recorded' },
                { trait_type: 'Warranty Months', value: serviceRecord.warranty_months?.toString() || '0' },
                { trait_type: 'Blockchain', value: 'Solana' },
                { trait_type: 'Network', value: 'Mainnet' }
            ],
            properties: {
                category: 'Service Record',
                creators: [
                    {
                        address: mintAuthority.publicKey.toString(),
                        verified: true,
                        share: 100
                    }
                ]
            }
        };

        // Update service record with NFT information
        const updatedServiceRecord = await base44.asServiceRole.entities.ServiceRecord.update(serviceRecordId, {
            nft_chain: 'Solana',
            nft_token_id: mint.publicKey.toString(),
            nft_tx_hash: signature,
            nft_minted_date: new Date().toISOString(),
            nft_recipient: recipientAddress,
            nft_metadata: metadata,
            invoice_id: invoice.id
        });
        
        // Create a notification for the recipient
        const vehicleOwner = await base44.asServiceRole.entities.User.filter({ wallet_address: recipientAddress });
        if (vehicleOwner.length > 0) {
            await base44.asServiceRole.entities.Notification.create({
                user_id: vehicleOwner[0].id,
                message: `You received a new Service Record NFT for your ${serviceRecord.vin.substring(0,8)}... from ${serviceRecord.shop_name}.`,
                type: 'nft_mint',
                link_to: `/Wallet`
            });
        }


        console.log(`NFT successfully minted: ${mint.publicKey.toString()}`);

        return Response.json({
            success: true,
            message: 'Service record NFT successfully minted on Solana',
            nft_token_id: mint.publicKey.toString(),
            transaction_hash: signature,
            recipient: recipientAddress,
            metadata: metadata,
            invoice: {
                number: invoiceNumber,
                amount_vin: mintFeeVIN,
                amount_usd: mintFeeUSD
            },
            solscan_url: `https://solscan.io/token/${mint.publicKey.toString()}`,
            explorer_url: `https://explorer.solana.com/address/${mint.publicKey.toString()}`
        });

    } catch (error) {
        console.error('Error minting NFT on Solana:', error);
        return Response.json({ 
            success: false,
            error: 'Failed to mint NFT on Solana blockchain', 
            details: error.message 
        }, { status: 500 });
    }
});
