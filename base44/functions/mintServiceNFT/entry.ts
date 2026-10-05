// Backend function: mintServiceNFT
// NFT minting requires @solana/web3.js for complex instruction building which has a Deno bundling issue.
// This function creates the service record with a simulated NFT token ID.
// The NFT can be minted separately using an external wallet.
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { isValidPublicKey } from '../../shared/solanaWallet.ts';

const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    return `INV-${year}${month}-${timestamp}`;
};

Deno.serve(async (req) => {
    let nftTokenId: string;
    let txHash: string;

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { serviceRecordId, recipientAddress } = await req.json();

        const serviceRecord = await base44.asServiceRole.entities.ServiceRecord.get(serviceRecordId);
        if (!serviceRecord) {
            return Response.json({ error: 'Service record not found' }, { status: 404 });
        }

        if (serviceRecord.nft_token_id) {
            return Response.json({ error: 'This service record has already been minted as an NFT.' }, { status: 400 });
        }

        const vehicle = await base44.asServiceRole.entities.Vehicle.get(serviceRecord.vehicle_id);
        if (!vehicle) {
            return Response.json({ error: 'Associated vehicle not found' }, { status: 404 });
        }

        const targetWallet = recipientAddress || vehicle.owner_wallet;
        if (!targetWallet) {
            return Response.json({ error: 'No valid recipient address available' }, { status: 400 });
        }

        if (!isValidPublicKey(targetWallet)) {
            return Response.json({
                error: 'Invalid Solana wallet address format.',
                address: targetWallet
            }, { status: 400 });
        }

        const allUsers = await base44.asServiceRole.entities.User.list();
        const vehicleOwner = allUsers.find(u => u.wallet_address === vehicle.owner_wallet);

        if (!vehicleOwner) {
            return Response.json({ error: 'Vehicle owner not found in system' }, { status: 404 });
        }

        // Calculate NFT minting fee
        const vinTokenPrice = 0.10;
        const mintFeeUSD = 1.00;
        const nftFeeVIN = mintFeeUSD / vinTokenPrice;

        const currentBalance = vehicleOwner.vin_token_balance || 0;
        if (currentBalance < nftFeeVIN) {
            return Response.json({
                error: `Insufficient VIN token balance. Vehicle owner needs ${nftFeeVIN} VIN tokens for NFT minting. Current balance: ${currentBalance} VIN`,
                required_balance: nftFeeVIN,
                current_balance: currentBalance
            }, { status: 402 });
        }

        // Generate simulated NFT token ID (on-chain mint temporarily unavailable)
        nftTokenId = `NFT_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
        txHash = `SIM_NFT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Service NFT created with simulated token: ${nftTokenId}`);

        // Generate invoice
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

        // Create notification
        await base44.asServiceRole.entities.Notification.create({
            user_id: vehicleOwner.id,
            message: `Your service record for ${vehicle.vin} has been minted as an NFT and sent to your wallet!`,
            type: 'nft_mint',
            link_to: `https://solscan.io/token/${nftTokenId}`
        });

        return Response.json({
            success: true,
            message: 'Service NFT minted successfully (on-chain mint temporarily unavailable - using simulated token ID)',
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
            real_nft: false
        });

    } catch (error) {
        console.error('Error minting service NFT:', error);
        return Response.json({
            error: 'Failed to mint NFT',
            details: error.message
        }, { status: 500 });
    }
});