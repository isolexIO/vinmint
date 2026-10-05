// Backend function: setupUserProfile
// Uses shared solanaWallet module for PublicKey validation instead of @solana/web3.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { isValidPublicKey } from '../../shared/solanaWallet.ts';

// Create business domain from name
const createBusinessDomain = (businessName: string) => {
    return businessName
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '') // Remove spaces
        .replace(/[^a-zA-Z0-9]/g, '') // Extra cleanup
        .substring(0, 20) // Limit length
        + '.VINmint';
};

// Generate invoice number
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

        const profileData = await req.json();
        const { invite_token } = profileData;
        let isInvited = false;
        let inviteRecord = null;

        // --- Invite Token Validation ---
        if (invite_token) {
            const invites = await base44.asServiceRole.entities.Invite.filter({ token: invite_token, status: 'pending' });
            if (invites.length > 0) {
                inviteRecord = invites[0];
                if (new Date(inviteRecord.expires_at) > new Date()) {
                    isInvited = true;
                    if (inviteRecord.user_type !== profileData.user_type) {
                        return Response.json({ error: 'Invite token is for a different user type.' }, { status: 400 });
                    }
                } else {
                    return Response.json({ error: 'Invite token has expired.' }, { status: 400 });
                }
            } else {
                return Response.json({ error: 'Invalid or already used invite token.' }, { status: 400 });
            }
        }

        // Validate wallet address
        if (profileData.wallet_address) {
            if (!isValidPublicKey(profileData.wallet_address)) {
                return Response.json({ error: 'Invalid Solana wallet address format provided.' }, { status: 400 });
            }
        } else {
            return Response.json({ error: 'Solana wallet address is required for profile setup.' }, { status: 400 });
        }

        // --- Geocode Address ---
        let latitude = null;
        let longitude = null;
        const addressToGeocode = profileData.address || profileData.shop_data?.address;

        if (addressToGeocode) {
            try {
                console.log(`Attempting to geocode address: ${addressToGeocode}`);
                const geocodeResponse = await base44.functions.invoke('geocodeAddress', { address: addressToGeocode });
                if (geocodeResponse.data.success) {
                    latitude = geocodeResponse.data.latitude;
                    longitude = geocodeResponse.data.longitude;
                    console.log(`Geocoding successful: lat=${latitude}, lon=${longitude}`);
                }
            } catch (e) {
                console.error("Geocoding failed during profile setup:", e.message);
            }
        }

        let shopId = null;
        let businessInvoice = null;

        const isAdminCreating = user.user_type === 'admin';
        const businessRegistrationFee = 1500;
        const usdRate = 0.10;

        if ((profileData.user_type === 'dealer' || profileData.user_type === 'shop_owner') && !isAdminCreating && !isInvited) {
            const invoiceNumber = generateInvoiceNumber();
            const businessName = profileData.user_type === 'dealer'
                ? (profileData.full_name || `Dealer_${user.id.substring(0, 8)}`)
                : profileData.shop_data.shop_name;
            const businessDomain = createBusinessDomain(businessName);

            businessInvoice = await base44.asServiceRole.entities.Invoice.create({
                customer_id: user.id,
                customer_email: user.email,
                invoice_number: invoiceNumber,
                invoice_type: 'business_registration',
                description: `Business Registration - ${businessName} (.VINmint Domain)`,
                item_reference: businessDomain,
                amount_vin: businessRegistrationFee,
                amount_usd: businessRegistrationFee * usdRate,
                discount_applied: 0,
                final_amount_vin: businessRegistrationFee,
                payment_status: 'paid',
                payment_date: new Date().toISOString(),
                transaction_hash: `SIM_BIZ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                customer_type: profileData.user_type
            });
        }

        if (profileData.user_type === 'shop_owner' && profileData.shop_data) {
            const certificationId = `CERT_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            const businessDomain = createBusinessDomain(profileData.shop_data.shop_name);

            const shopPayload = {
                ...profileData.shop_data,
                certification_id: certificationId,
                business_domain: businessDomain,
                domain_nft_token_id: `DOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                wallet_address: profileData.wallet_address,
                status: isAdminCreating || isInvited ? 'approved' : 'pending',
                rating: 0,
                total_services: 0,
                latitude,
                longitude,
                offered_services: [],
                ...(businessInvoice && { registration_invoice_id: businessInvoice.id })
            };

            const shop = await base44.asServiceRole.entities.CertifiedShop.create(shopPayload);
            shopId = shop.id;
        }

        let userUpdatePayload: Record<string, unknown> = {
            user_type: profileData.user_type,
            wallet_address: profileData.wallet_address,
            profile_completed: true,
            ...(shopId && { shop_id: shopId }),
            ...(businessInvoice && { registration_invoice_id: businessInvoice.id })
        };

        if (profileData.user_type === 'dealer') {
            const businessName = profileData.full_name || `Dealer_${user.id.substring(0, 8)}`;
            const businessDomain = createBusinessDomain(businessName);

            userUpdatePayload.latitude = latitude;
            userUpdatePayload.longitude = longitude;
            userUpdatePayload.address = profileData.address;
            userUpdatePayload.phone = profileData.phone;
            userUpdatePayload.business_license = profileData.business_license || `DLR_${Date.now()}`;
            userUpdatePayload.dealer_status = isAdminCreating || isInvited ? 'approved' : 'pending';
            userUpdatePayload.business_domain = businessDomain;
            userUpdatePayload.domain_nft_token_id = `DOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } else if (profileData.user_type === 'vehicle_owner') {
            userUpdatePayload.address = profileData.address;
            userUpdatePayload.phone = profileData.phone;
        }

        const updatedUser = await base44.asServiceRole.entities.User.update(user.id, userUpdatePayload);

        if (isInvited && inviteRecord) {
            await base44.asServiceRole.entities.Invite.update(inviteRecord.id, {
                status: 'accepted',
                accepted_by_user_id: user.id,
                accepted_at: new Date().toISOString()
            });
        }

        return Response.json({
            success: true,
            shop_id: shopId,
            business_invoice_id: businessInvoice?.id,
            business_domain: updatedUser.business_domain || (shopId ? createBusinessDomain(profileData.shop_data?.shop_name) : null),
            admin_created: isAdminCreating,
            invited: isInvited,
            message: isAdminCreating
                ? "Profile setup completed successfully by admin (no fees applied)"
                : isInvited
                    ? "Profile setup completed successfully via invite (no fees applied)"
                    : "Profile setup completed successfully"
        });

    } catch (error) {
        console.error('Error setting up user profile:', error);
        return Response.json({
            error: 'Failed to setup profile',
            details: error.message
        }, { status: 500 });
    }
});