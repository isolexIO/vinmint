// Backend function: manageVinVault
// Uses direct Solana RPC fetch calls instead of @solana/web3.js to avoid Deno bundling issues
// Note: 'distribute' action requires transaction signing which needs @solana/web3.js.
// For now, distribute returns an error directing the admin to use an external wallet.
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
const VIN_TOKEN_MINT_ADDRESS = "DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.user_type !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
        }

        const { action, recipientAddress, amount, reason, tokenType } = await req.json();

        if (!action) {
            return Response.json({ error: 'Action is required (balance, distribute)' }, { status: 400 });
        }

        const vaultConfigs = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'vin_vault' });
        if (vaultConfigs.length === 0 || !vaultConfigs[0].public_key) {
            return Response.json({ error: 'VIN Vault is not configured.' }, { status: 404 });
        }

        const vaultPublicKey = vaultConfigs[0].public_key;

        if (action === 'balance') {
            try {
                // Fetch SOL balance via RPC
                const solResponse = await fetch(SOLANA_RPC_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: 1,
                        method: "getBalance",
                        params: [vaultPublicKey, { commitment: "confirmed" }]
                    })
                });
                const solData = await solResponse.json();
                const solBalance = (solData.result?.value || 0) / 1_000_000_000;

                // Fetch VIN token balance via RPC
                let vinBalance = 0;
                let hasTokenAccount = false;
                let tokenAccountAddress = '';

                try {
                    const tokenResponse = await fetch(SOLANA_RPC_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            id: 2,
                            method: "getTokenAccountsByOwner",
                            params: [
                                vaultPublicKey,
                                { mint: VIN_TOKEN_MINT_ADDRESS },
                                { encoding: "jsonParsed", commitment: "confirmed" }
                            ]
                        })
                    });
                    const tokenData = await tokenResponse.json();

                    if (tokenData.result?.value && tokenData.result.value.length > 0) {
                        const account = tokenData.result.value[0];
                        const parsedInfo = account.account?.data?.parsed?.info;
                        if (parsedInfo?.tokenAmount) {
                            vinBalance = Number(parsedInfo.tokenAmount.amount || 0) / 1_000_000;
                            hasTokenAccount = true;
                            tokenAccountAddress = account.pubkey;
                        }
                    }
                } catch (tokenError) {
                    console.warn("VIN token account not found:", tokenError.message);
                }

                return Response.json({
                    success: true,
                    vaultAddress: vaultPublicKey,
                    solBalance,
                    vinBalance,
                    hasTokenAccount,
                    tokenAccountAddress
                });

            } catch (balanceError) {
                return Response.json({
                    success: false,
                    error: 'Failed to fetch vault balance',
                    details: balanceError.message,
                }, { status: 500 });
            }
        }

        if (action === 'distribute') {
            // Distribution requires transaction signing which needs @solana/web3.js.
            // The library has a Deno bundling issue, so this action is temporarily unavailable.
            return Response.json({
                success: false,
                error: 'Token distribution is temporarily unavailable. Please use an external wallet (e.g., Phantom) to send tokens directly from the vault address.',
                suggestion: `Send ${amount || ''} ${tokenType || ''} from ${vaultPublicKey} to ${recipientAddress || 'recipient'} using an external wallet.`
            }, { status: 501 });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Vault function error:', error);
        return Response.json({
            success: false,
            error: 'Vault operation failed',
            details: error.message
        }, { status: 500 });
    }
});