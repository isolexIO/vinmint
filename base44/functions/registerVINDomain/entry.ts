// Backend function: registerVINDomain
// NFT minting requires @solana/web3.js for complex instruction building which has a Deno bundling issue.
// This function creates the vehicle record and invoice without the on-chain NFT mint.
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
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vin, vehicleData } = await req.json();

        console.log(`VIN registration request for: ${vin} by user: ${user.id}`);

        // Step 1: Check if VIN already exists
        const existingVehicles = await base44.entities.Vehicle.filter({ vin: vin.toUpperCase() });
        if (existingVehicles.length > 0) {
            return Response.json({
                success: false,
                error: 'This VIN is already registered in the system.',
                existing_vehicle: existingVehicles[0]
            }, { status: 400 });
        }

        // Step 2: Create .VINmint domain
        const domain = `${vin.toUpperCase()}.VINmint`;

        // Step 3: Validate wallet address
        let ownerWallet = vehicleData.owner_wallet || user.wallet_address;
        if (!ownerWallet) {
            return Response.json({
                success: false,
                error: 'No valid wallet address found. Please ensure your profile has a wallet address.'
            }, { status: 400 });
        }

        if (!isValidPublicKey(ownerWallet)) {
            return Response.json({
                success: false,
                error: 'Invalid Solana wallet address format.',
                address: ownerWallet
            }, { status: 400 });
        }

        // Step 4: Calculate registration fee
        const vinTokenPrice = 0.10;
        const registrationFeeUSD = 49.00;
        const registrationFeeVIN = registrationFeeUSD / vinTokenPrice;

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

        // Step 5: Generate a simulated NFT token ID (on-chain mint temporarily unavailable)
        const domainNftTokenId = `DOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mintTxHash = `SIM_VIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log(`VIN ${vin} registered with simulated NFT token: ${domainNftTokenId}`);

        // Step 6: Generate invoice
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

        // Step 8: Update user's VIN token balance
        if (user.user_type === 'vehicle_owner') {
            const newBalance = (user.vin_token_balance || 0) - registrationFeeVIN;
            await base44.asServiceRole.entities.User.update(user.id, {
                vin_token_balance: Math.max(0, newBalance)
            });
        }

        // Step 9: Create notification
        await base44.asServiceRole.entities.Notification.create({
            user_id: user.id,
            message: `Your VIN ${vin} has been successfully registered as ${domain}!`,
            type: 'nft_mint',
            link_to: `https://solscan.io/token/${domainNftTokenId}`
        });

        console.log(`VIN ${vin} successfully registered as ${domain}`);

        return Response.json({
            success: true,
            message: 'VIN domain registered successfully (on-chain NFT minting temporarily unavailable - using simulated token ID)',
            vehicle: vehicle,
            domain: domain,
            domain_nft_token_id: domainNftTokenId,
            transaction_hash: mintTxHash,
            invoice: {
                number: invoiceNumber,
                amount_vin: registrationFeeVIN,
                amount_usd: registrationFeeUSD
            },
            real_nft: false
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