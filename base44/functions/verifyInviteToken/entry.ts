import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token } = await req.json();

        if (!token) {
            return Response.json({ error: 'Invite token is required.' }, { status: 400 });
        }

        const invites = await base44.asServiceRole.entities.Invite.filter({ token: token, status: 'pending' });

        if (invites.length === 0) {
            return Response.json({ error: 'Invalid or already used invite token.' }, { status: 404 });
        }

        const invite = invites[0];

        if (new Date(invite.expires_at) < new Date()) {
            // Optionally update status to expired
            await base44.asServiceRole.entities.Invite.update(invite.id, { status: 'expired' });
            return Response.json({ error: 'This invite link has expired.' }, { status: 410 });
        }

        return Response.json({
            success: true,
            user_type: invite.user_type,
            email: invite.email // Will be null for generic links, but allows for future extension
        });

    } catch (error) {
        console.error('Error verifying invite token:', error);
        return Response.json({ 
            error: 'Failed to verify invite token', 
            details: error.message 
        }, { status: 500 });
    }
});