// Backend function: transferVinAndNfts
// Uses shared solanaWallet module for validation instead of @solana/web3.js
// Note: This function only updates database records (no on-chain NFT transfer needed)
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { isValidPublicKey } from '../../shared/solanaWallet.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.wallet_address) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vehicleId, newOwnerWallet } = await req.json();

        if (!newOwnerWallet) {
            return Response.json({ error: 'New owner wallet address is required.' }, { status: 400 });
        }
        if (!isValidPublicKey(newOwnerWallet)) {
            return Response.json({ error: 'Invalid new owner wallet address format.' }, { status: 400 });
        }

        // 1. Get the vehicle and verify ownership
        const vehicle = await base44.asServiceRole.entities.Vehicle.get(vehicleId);
        if (!vehicle) {
            return Response.json({ error: 'Vehicle not found' }, { status: 404 });
        }
        if (vehicle.owner_wallet !== user.wallet_address) {
            return Response.json({ error: 'You do not own this vehicle' }, { status: 403 });
        }

        // 2. Transfer the Vehicle (update ownership in database)
        await base44.asServiceRole.entities.Vehicle.update(vehicleId, {
            previous_owners: [...(vehicle.previous_owners || []), vehicle.owner_wallet],
            owner_wallet: newOwnerWallet
        });

        // 3. Transfer all associated Service Record NFTs (update recipient in database)
        const serviceRecords = await base44.asServiceRole.entities.ServiceRecord.filter({ vehicle_id: vehicleId });

        let transferredServiceNfts = 0;
        for (const record of serviceRecords) {
            if (record.nft_token_id) {
                await base44.asServiceRole.entities.ServiceRecord.update(record.id, {
                    nft_recipient: newOwnerWallet
                });
                transferredServiceNfts++;
            }
        }

        console.log(`Transferred vehicle ${vehicleId} and ${transferredServiceNfts} service NFTs to ${newOwnerWallet}`);

        return Response.json({
            success: true,
            message: `Successfully transferred VIN and ${transferredServiceNfts} associated service NFTs.`,
        });

    } catch (error) {
        console.error('Error during atomic transfer:', error);
        return Response.json({
            error: 'Transfer failed',
            details: error.message
        }, { status: 500 });
    }
});