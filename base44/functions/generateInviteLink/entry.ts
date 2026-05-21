import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { v4 as uuidv4 } from 'npm:uuid@9.0.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const adminUser = await base44.auth.me();

        if (!adminUser || adminUser.user_type !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
        }

        const { user_type } = await req.json();

        if (!['shop_owner', 'dealer'].includes(user_type)) {
            return Response.json({ error: 'Invalid user type specified for invite.' }, { status: 400 });
        }

        const token = uuidv4();
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7-day expiry

        await base44.asServiceRole.entities.Invite.create({
            token,
            user_type,
            status: 'pending',
            expires_at
        });

        return Response.json({ success: true, token });

    } catch (error) {
        console.error('Error generating invite link:', error);
        return Response.json({ 
            error: 'Failed to generate invite link', 
            details: error.message 
        }, { status: 500 });
    }
});