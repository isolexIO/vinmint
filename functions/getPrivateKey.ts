import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        console.log("Private key request from user:", user?.id, "wallet:", user?.wallet_address);

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!user.wallet_address) {
            return Response.json({ error: 'No wallet found for this user' }, { status: 404 });
        }

        // Retrieve the stored secret key
        const secretKey = user.wallet_secret_key;

        console.log("Secret key lookup result:", {
            hasSecretKey: !!secretKey,
            secretKeyType: typeof secretKey,
            secretKeyLength: secretKey ? secretKey.length : 0
        });

        if (!secretKey || !Array.isArray(secretKey) || secretKey.length === 0) {
            console.error("Private key not found or invalid format for user:", user.id);
            return Response.json({ 
                error: 'Private key not found for this user. Please regenerate your wallet.',
                suggestion: 'Try disconnecting and reconnecting your wallet'
            }, { status: 404 });
        }

        return Response.json({
            success: true,
            private_key: secretKey,
            debug: {
                keyLength: secretKey.length,
                keyType: typeof secretKey
            }
        });

    } catch (error) {
        console.error('Error retrieving private key:', error);
        return Response.json({ 
            error: 'Failed to retrieve private key', 
            details: error.message 
        }, { status: 500 });
    }
});