import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { address } = await req.json();

        if (!address) {
            return Response.json({ error: 'Address is required' }, { status: 400 });
        }

        console.log(`Geocoding address: ${address}`);

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Find the precise latitude and longitude for the following address: "${address}". Return only the coordinates. If the address is invalid or cannot be found, return latitude and longitude as null.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    latitude: { type: ["number", "null"] },
                    longitude: { type: ["number", "null"] }
                },
                required: ["latitude", "longitude"]
            }
        });

        if (response.latitude === null || response.longitude === null) {
            console.warn(`Could not geocode address: ${address}`);
            return Response.json({ success: false, message: 'Could not geocode address', latitude: null, longitude: null });
        }
        
        console.log(`Geocoded successfully:`, response);

        return Response.json({
            success: true,
            latitude: response.latitude,
            longitude: response.longitude
        });

    } catch (error) {
        console.error('Error during geocoding:', error);
        return Response.json({ 
            error: 'Failed to geocode address', 
            details: error.message 
        }, { status: 500 });
    }
});