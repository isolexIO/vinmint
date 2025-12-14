import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.user_type !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        // Get all dealers that don't have coordinates but have an address
        const allDealers = await base44.asServiceRole.entities.User.filter({ user_type: 'dealer' });
        const dealersToGeocode = allDealers.filter(dealer => (!dealer.latitude || !dealer.longitude) && dealer.address);
        
        if (dealersToGeocode.length === 0) {
            return Response.json({
                success: true,
                message: 'All dealers already have coordinates or are missing an address.',
                updated_count: 0
            });
        }

        let updatedCount = 0;
        console.log(`Found ${dealersToGeocode.length} dealers to geocode.`);

        // Geocode each dealer
        for (const dealer of dealersToGeocode) {
            try {
                const geocodeResponse = await base44.functions.invoke('geocodeAddress', { address: dealer.address });
                
                if (geocodeResponse.data.success && geocodeResponse.data.latitude && geocodeResponse.data.longitude) {
                    await base44.asServiceRole.entities.User.update(dealer.id, {
                        latitude: geocodeResponse.data.latitude,
                        longitude: geocodeResponse.data.longitude
                    });
                    updatedCount++;
                    console.log(`Successfully geocoded dealer ${dealer.id}`);
                } else {
                    console.warn(`Could not geocode address for dealer ${dealer.id}: ${dealer.address}`);
                }
            } catch (e) {
                 console.error(`Error geocoding dealer ${dealer.id}:`, e.message);
            }
        }

        return Response.json({
            success: true,
            message: `Attempted to geocode ${dealersToGeocode.length} dealers. Successfully updated ${updatedCount}.`,
            total_dealers: allDealers.length,
            updated_dealers: updatedCount
        });

    } catch (error) {
        console.error('Error geocoding dealer coordinates:', error);
        return Response.json({ 
            error: 'Failed to geocode dealer coordinates', 
            details: error.message 
        }, { status: 500 });
    }
});