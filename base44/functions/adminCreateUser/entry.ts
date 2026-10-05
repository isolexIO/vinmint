// Backend function: adminCreateUser
// Uses shared solanaWallet module (tweetnacl) instead of @solana/web3.js to avoid Deno bundling issues
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { generateKeypair } from '../../shared/solanaWallet.ts';

// Helper to generate random coordinates within the continental US
const getRandomUSCoordinates = () => {
    const lat = Math.random() * (49.38 - 24.39) + 24.39;
    const lng = Math.random() * (-66.93 - (-125.00)) + (-125.00);
    return { latitude: lat, longitude: lng };
};

// Create business domain from name
const createBusinessDomain = (businessName: string) => {
    return businessName
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 20)
        + '.VINmint';
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const adminUser = await base44.auth.me();

        if (!adminUser || adminUser.user_type !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
        }

        const userData = await req.json();

        if (!userData.email || !userData.full_name || !userData.user_type) {
            return Response.json({ error: 'Missing required fields: email, full_name, user_type' }, { status: 400 });
        }

        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: userData.email });
        if (existingUsers.length > 0) {
            return Response.json({ error: 'User with this email already exists' }, { status: 400 });
        }

        // --- Generate a new native wallet for the user ---
        let keypair;
        let publicKey: string;
        let attempts = 0;
        const maxAttempts = 50000;

        while (attempts < maxAttempts) {
            keypair = generateKeypair();
            publicKey = keypair.publicKeyBase58;
            attempts++;
            if (publicKey.startsWith('VIN')) break;
        }
        if (!publicKey.startsWith('VIN')) {
            keypair = generateKeypair();
            publicKey = keypair.publicKeyBase58;
        }
        const secretKey = Array.from(keypair.secretKey);

        const { latitude, longitude } = getRandomUSCoordinates();
        let shopId = null;
        let businessDomain = null;

        const newUser = await base44.asServiceRole.entities.User.create({
            email: userData.email,
            full_name: userData.full_name,
            user_type: userData.user_type,
            wallet_address: publicKey,
            wallet_secret_key: secretKey,
            phone: userData.phone || null,
            address: userData.address || null,
            profile_completed: true,
            role: 'user'
        });

        if (userData.user_type === 'shop_owner' && userData.shop_data) {
            const certificationId = `CERT_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            businessDomain = createBusinessDomain(userData.shop_data.shop_name);

            const shopPayload = {
                ...userData.shop_data,
                certification_id: certificationId,
                business_domain: businessDomain,
                domain_nft_token_id: `DOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                wallet_address: publicKey,
                status: 'approved',
                rating: 0,
                total_services: 0,
                latitude,
                longitude,
                offered_services: []
            };

            const shop = await base44.asServiceRole.entities.CertifiedShop.create(shopPayload);
            shopId = shop.id;

            await base44.asServiceRole.entities.User.update(newUser.id, { shop_id: shopId });
        }

        if (userData.user_type === 'dealer') {
            const domainSourceName = userData.business_name || userData.full_name;
            businessDomain = createBusinessDomain(domainSourceName);

            await base44.asServiceRole.entities.User.update(newUser.id, {
                latitude,
                longitude,
                business_license: userData.business_license || `DLR_${Date.now()}`,
                dealer_status: 'approved',
                business_domain: businessDomain,
                domain_nft_token_id: `DOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                dealer_verification_date: new Date().toISOString().split('T')[0]
            });
        }

        return Response.json({
            success: true,
            message: `${userData.user_type} account and native wallet created successfully by admin (no fees charged)`,
            user_id: newUser.id,
            shop_id: shopId,
            business_domain: businessDomain,
            generated_wallet: publicKey
        });

    } catch (error) {
        console.error('Error creating user directly:', error);
        return Response.json({
            error: 'Failed to create user account',
            details: error.message
        }, { status: 500 });
    }
});