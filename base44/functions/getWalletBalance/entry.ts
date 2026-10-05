// Backend function: getWalletBalance
// Uses direct Solana RPC fetch calls with authenticated endpoint from secrets
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { secrets } from 'base44:runtime';

const VIN_TOKEN_MINT_ADDRESS = "DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { walletAddress } = await req.json();

        if (!walletAddress) {
            return Response.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const rpcUrl = secrets.get("SOLANA_RPC_URL");
        const SOLANA_RPC_URL = rpcUrl || "https://api.mainnet-beta.solana.com";

        // Fetch SOL balance via RPC
        const solResponse = await fetch(SOLANA_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getBalance",
                params: [walletAddress, { commitment: "confirmed" }]
            })
        });
        const solData = await solResponse.json();
        const solBalance = (solData.result?.value || 0) / 1_000_000_000;

        // Fetch VIN token balance via RPC
        let vinTokenBalance = 0;
        let debugInfo: Record<string, unknown> = {};

        try {
            const tokenResponse = await fetch(SOLANA_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 2,
                    method: "getTokenAccountsByOwner",
                    params: [
                        walletAddress,
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
                    vinTokenBalance = Number(parsedInfo.tokenAmount.amount || 0) / 1_000_000;
                    debugInfo.tokenAccountAddress = account.pubkey;
                    debugInfo.rawAmount = parsedInfo.tokenAmount.amount;
                    debugInfo.decimals = parsedInfo.tokenAmount.decimals;
                    debugInfo.success = true;
                }
            } else {
                debugInfo.reason = 'no_token_account';
                debugInfo.tokenRpcStatus = tokenResponse.status;
                debugInfo.tokenRpcError = tokenData.error;
            }
        } catch (tokenError) {
            debugInfo.error = tokenError.message;
            debugInfo.reason = 'fetch_error';
            vinTokenBalance = 0;
        }

        return Response.json({
            success: true,
            solBalance,
            vinTokenBalance,
            debug: debugInfo,
            rpcUsed: SOLANA_RPC_URL.substring(0, 60),
            solRpcStatus: solResponse.status,
            solRpcError: solData.error,
            network: 'mainnet-beta',
            tokenProgram: 'Token 2022',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: 'Failed to fetch wallet balance',
            details: error.message,
            network: 'mainnet-beta',
            tokenProgram: 'Token 2022'
        }, { status: 500 });
    }
});