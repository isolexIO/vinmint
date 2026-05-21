import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.user_type !== 'dealer' && user.user_type !== 'admin')) {
            return Response.json({ error: 'Unauthorized: Only dealers or admins can bulk upload vehicles.' }, { status: 401 });
        }

        const { fileUrl } = await req.json();
        
        if (!fileUrl) {
            return Response.json({ error: 'File URL is required' }, { status: 400 });
        }

        console.log("Processing bulk vehicle upload for dealer:", user.email);

        // Define the expected CSV schema
        const csvSchema = {
            type: "array",
            items: {
                type: "object",
                properties: {
                    vin: { type: "string" },
                    make: { type: "string" },
                    model: { type: "string" },
                    year: { type: "string" },
                    color: { type: "string" },
                    mileage: { type: "string" },
                    owner_wallet: { type: "string" }
                },
                required: ["vin", "make", "model", "year"]
            }
        };

        // Extract data from the uploaded CSV file using the Core integration
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: fileUrl,
            json_schema: csvSchema
        });

        if (extractResult.status !== 'success') {
            return Response.json({ 
                error: 'Failed to process CSV file', 
                details: extractResult.details 
            }, { status: 400 });
        }

        const vehicleData = extractResult.output;
        console.log(`Processing ${vehicleData.length} vehicles from CSV`);

        const results = {
            successful: [],
            failed: [],
            total: vehicleData.length
        };

        // Process each vehicle
        for (const vehicleRow of vehicleData) {
            try {
                // Validate VIN format
                if (!vehicleRow.vin || vehicleRow.vin.length !== 17) {
                    throw new Error("Invalid VIN format - must be 17 characters");
                }

                // Check if VIN already exists
                const existingVehicles = await base44.asServiceRole.entities.Vehicle.filter({ vin: vehicleRow.vin.toUpperCase() });
                if (existingVehicles.length > 0) {
                    throw new Error("VIN already registered in system");
                }

                // Use dealer's wallet if no owner_wallet specified
                const ownerWallet = vehicleRow.owner_wallet || user.wallet_address;
                if (!ownerWallet) {
                    throw new Error("No owner wallet specified and dealer has no wallet address");
                }

                // Create the vehicle record
                const vehiclePayload = {
                    vin: vehicleRow.vin.toUpperCase(),
                    domain: `${vehicleRow.vin.toUpperCase()}.VINmint`,
                    make: vehicleRow.make,
                    model: vehicleRow.model,
                    year: parseInt(vehicleRow.year),
                    color: vehicleRow.color || null,
                    mileage: vehicleRow.mileage ? parseInt(vehicleRow.mileage) : 0,
                    owner_wallet: ownerWallet,
                    previous_owners: [],
                    status: "active",
                    dealer_id: user.id,
                    domain_nft_token_id: `BULK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };

                const vehicle = await base44.asServiceRole.entities.Vehicle.create(vehiclePayload);
                
                results.successful.push({
                    vin: vehicleRow.vin,
                    id: vehicle.id,
                    message: "Successfully registered"
                });

                console.log(`Successfully processed VIN: ${vehicleRow.vin}`);

            } catch (error) {
                console.error(`Error processing VIN ${vehicleRow.vin}:`, error);
                results.failed.push({
                    vin: vehicleRow.vin || "Unknown",
                    error: error.message
                });
            }
        }

        console.log(`Bulk upload completed. Success: ${results.successful.length}, Failed: ${results.failed.length}`);

        return Response.json({
            success: true,
            results,
            message: `Processed ${results.total} vehicles. ${results.successful.length} successful, ${results.failed.length} failed.`
        });

    } catch (error) {
        console.error('Error in bulk upload:', error);
        return Response.json({ 
            error: 'Bulk upload failed', 
            details: error.message 
        }, { status: 500 });
    }
});