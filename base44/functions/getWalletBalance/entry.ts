// Backend function: getWalletBalance
// Uses direct Solana RPC fetch calls with authenticated endpoint from secrets
// Token balance is fetched via getAccountInfo on the ATA (computed by the caller)
// to avoid rate-limited getTokenAccountsByOwner calls
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

        const { walletAddress, ataAddress } = await req.json();

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

        // Fetch VIN token balance via getAccountInfo on the ATA
        // This avoids the rate-limited getTokenAccountsByOwner method
        let vinTokenBalance = 0;
        let debugInfo: Record<string, unknown> = {};

        if (ataAddress) {
            try {
                const accountResponse = await fetch(SOLANA_RPC_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: 2,
                        method: "getAccountInfo",
                        params: [ataAddress, { encoding: "jsonParsed", commitment: "confirmed" }]
                    })
                });
                const accountData = await accountResponse.json();

                if (accountData.result?.value?.data?.parsed?.info?.tokenAmount) {
                    const tokenAmount = accountData.result.value.data.parsed.info.tokenAmount;
                    vinTokenBalance = Number(tokenAmount.amount || 0) / Math.pow(10, tokenAmount.decimals || 6);
                    debugInfo.tokenAccountAddress = ataAddress;
                    debugInfo.rawAmount = tokenAmount.amount;
                    debugInfo.decimals = tokenAmount.decimals;
                    debugInfo.success = true;
                } else if (accountData.result?.value === null) {
                    debugInfo.reason = 'ata_not_found';
                    debugInfo.tokenRpcStatus = accountResponse.status;
                } else {
                    debugInfo.reason = 'parse_failed';
                    debugInfo.tokenRpcStatus = accountResponse.status;
                    debugInfo.rawData = JSON.stringify(accountData.result?.value?.data).substring(0, 200);
                }
            } catch (tokenError) {
                debugInfo.error = tokenError.message;
                debugInfo.reason = 'fetch_error';
            }
        } else {
            // Fallback: try getTokenAccountsByOwner if no ATA provided
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
                        debugInfo.fallback = true;
                    }
                } else {
                    debugInfo.reason = 'no_token_account';
                    debugInfo.tokenRpcStatus = tokenResponse.status;
                    debugInfo.tokenRpcError = tokenData.error;
                    debugInfo.fallback = true;
                }
            } catch (tokenError) {
                debugInfo.error = tokenError.message;
                debugInfo.reason = 'fetch_error';
                debugInfo.fallback = true;
            }
        }

        return Response.json({
            success: true,
            solBalance,
            vinTokenBalance,
            debug: debugInfo,
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