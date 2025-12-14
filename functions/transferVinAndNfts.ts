import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import {
    Connection,
    clusterApiUrl,
    Keypair,
    PublicKey,
    Transaction,
} from 'npm:@solana/web3.js@1.78.5';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAccount,
} from 'npm:@solana/spl-token@0.3.8';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.wallet_address) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vehicleId, newOwnerWallet } = await req.json();

        // Validate the new owner's wallet address format
        if (!newOwnerWallet) {
            return Response.json({ error: 'New owner wallet address is required.' }, { status: 400 });
        }
        try {
            new PublicKey(newOwnerWallet);
        } catch (e) {
            return Response.json({ error: 'Invalid new owner wallet address format.', details: e.message }, { status: 400 });
        }

        // 1. Get the vehicle and verify ownership
        const vehicle = await base44.asServiceRole.entities.Vehicle.get(vehicleId);
        if (!vehicle) {
            return Response.json({ error: 'Vehicle not found' }, { status: 404 });
        }
        if (vehicle.owner_wallet !== user.wallet_address) {
            return Response.json({ error: 'You do not own this vehicle' }, { status: 403 });
        }

        // 2. Transfer the Vehicle (VIN NFT)
        await base44.asServiceRole.entities.Vehicle.update(vehicleId, {
            previous_owners: [...(vehicle.previous_owners || []), vehicle.owner_wallet],
            owner_wallet: newOwnerWallet
        });

        // 3. Find and transfer all associated Service Record NFTs
        const serviceRecords = await base44.asServiceRole.entities.ServiceRecord.filter({ vehicle_id: vehicleId });
        
        let transferredServiceNfts = 0;
        for (const record of serviceRecords) {
            if (record.nft_token_id) { // Only transfer if it's an NFT
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