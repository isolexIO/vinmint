// Backend function: mintRealSolanaNFT
// NFT minting requires @solana/web3.js for complex instruction building (createAccount, initializeMint, etc.)
// which has a Deno bundling issue. This function returns a clear error directing to an external wallet.
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return Response.json({
            success: false,
            error: 'On-chain NFT minting is temporarily unavailable due to a library deployment issue. Please use an external wallet (e.g., Phantom) or Metaplex tools to mint the NFT, then update the service record manually with the token ID and transaction hash.',
            action_needed: 'Mint the NFT using an external tool, then update the service record with the resulting token ID and transaction hash.'
        }, { status: 501 });

    } catch (error) {
        console.error('Error in mintRealSolanaNFT:', error);
        return Response.json({
            success: false,
            error: 'Failed to mint NFT',
            details: error.message
        }, { status: 500 });
    }
});