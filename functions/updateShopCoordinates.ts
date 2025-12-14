import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.user_type !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        // Get all shops that don't have coordinates but have an address
        const allShops = await base44.asServiceRole.entities.CertifiedShop.list();
        const shopsToGeocode = allShops.filter(shop => (!shop.latitude || !shop.longitude) && shop.address);

        if (shopsToGeocode.length === 0) {
            return Response.json({
                success: true,
                message: 'All shops already have coordinates or are missing an address.',
                updated_count: 0
            });
        }
        
        let updatedCount = 0;
        console.log(`Found ${shopsToGeocode.length} shops to geocode.`);

        // Geocode each shop
        for (const shop of shopsToGeocode) {
            try {
                const geocodeResponse = await base44.functions.invoke('geocodeAddress', { address: shop.address });

                if (geocodeResponse.data.success && geocodeResponse.data.latitude && geocodeResponse.data.longitude) {
                    await base44.asServiceRole.entities.CertifiedShop.update(shop.id, {
                        latitude: geocodeResponse.data.latitude,
                        longitude: geocodeResponse.data.longitude
                    });
                    updatedCount++;
                    console.log(`Successfully geocoded shop ${shop.id}`);
                } else {
                    console.warn(`Could not geocode address for shop ${shop.id}: ${shop.address}`);
                }
            } catch (e) {
                console.error(`Error geocoding shop ${shop.id}:`, e.message);
            }
        }

        return Response.json({
            success: true,
            message: `Attempted to geocode ${shopsToGeocode.length} shops. Successfully updated ${updatedCount}.`,
            total_shops: allShops.length,
            updated_shops: updatedCount
        });

    } catch (error) {
        console.error('Error geocoding shop coordinates:', error);
        return Response.json({ 
            error: 'Failed to geocode shop coordinates', 
            details: error.message 
        }, { status: 500 });
    }
});