import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { Connection, clusterApiUrl, PublicKey } from 'npm:@solana/web3.js@1.78.5';
import { 
    getAssociatedTokenAddress, 
    getAccount,
    TOKEN_2022_PROGRAM_ID 
} from 'npm:@solana/spl-token@0.3.8';

const VIN_TOKEN_MINT_ADDRESS = "DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg"; // Token 2022 VIN Token Mint

Deno.serve(async (req) => {
    console.log("getWalletBalance function invoked for Token 2022 mainnet.");
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.log("Unauthorized access attempt to getWalletBalance.");
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { walletAddress } = await req.json();
        
        if (!walletAddress) {
            console.error("Missing walletAddress in request body.");
            return Response.json({ error: 'Wallet address is required' }, { status: 400 });
        }
        
        console.log(`Fetching Token 2022 balance for wallet: ${walletAddress}`);
        console.log(`VIN Token Mint Address: ${VIN_TOKEN_MINT_ADDRESS}`);
        
        // Use mainnet-beta with Token 2022 support
        const connection = new Connection(
            clusterApiUrl('mainnet-beta'),
            {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000
            }
        );
        
        const publicKey = new PublicKey(walletAddress);
        const mintPublicKey = new PublicKey(VIN_TOKEN_MINT_ADDRESS);

        // Fetch SOL balance
        console.log("Fetching SOL balance from mainnet...");
        const solBalanceLamports = await connection.getBalance(publicKey);
        const solBalance = solBalanceLamports / 1_000_000_000;
        console.log(`SOL balance found: ${solBalance} SOL`);

        // Fetch $VIN token balance with Token 2022 program
        let vinTokenBalance = 0;
        let debugInfo = {};
        
        try {
            console.log("Computing associated token account address for Token 2022 VIN token...");
            const tokenAccountAddress = await getAssociatedTokenAddress(
                mintPublicKey, 
                publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID // Use Token 2022 program
            );
            console.log(`Token 2022 account address: ${tokenAccountAddress.toBase58()}`);
            
            debugInfo.tokenAccountAddress = tokenAccountAddress.toBase58();
            
            console.log("Fetching Token 2022 account info...");
            const tokenAccountInfo = await getAccount(
                connection, 
                tokenAccountAddress, 
                'confirmed', 
                TOKEN_2022_PROGRAM_ID // Use Token 2022 program
            );
            console.log("Token 2022 account info:", tokenAccountInfo);
            
            // VIN token has 6 decimals according to the mint
            vinTokenBalance = Number(tokenAccountInfo.amount) / 1_000_000;
            console.log(`$VIN Token 2022 balance found: ${vinTokenBalance} VIN`);
            
            debugInfo.rawAmount = tokenAccountInfo.amount.toString();
            debugInfo.decimals = 6;
            debugInfo.success = true;
            debugInfo.programId = TOKEN_2022_PROGRAM_ID.toBase58();
            
        } catch (tokenError) {
            console.log(`Token 2022 account error: ${tokenError.message}`);
            debugInfo.error = tokenError.message;
            
            // Check if the token account doesn't exist vs other errors
            if (tokenError.message.includes('could not find account') || 
                tokenError.message.includes('Invalid account owner')) {
                console.log("Token 2022 account doesn't exist - user has 0 VIN tokens");
                vinTokenBalance = 0;
                debugInfo.reason = 'no_token_account';
            } else {
                console.error("Unexpected error fetching Token 2022 VIN balance:", tokenError);
                vinTokenBalance = 0;
                debugInfo.reason = 'fetch_error';
            }
        }

        const responsePayload = {
            success: true,
            solBalance,
            vinTokenBalance,
            debug: debugInfo,
            network: 'mainnet-beta',
            tokenProgram: 'Token 2022',
            timestamp: new Date().toISOString()
        };
        
        console.log("Successfully fetched Token 2022 mainnet balances:", responsePayload);
        return Response.json(responsePayload);

    } catch (error) {
        console.error('Critical error in Token 2022 getWalletBalance function:', error);
        return Response.json({ 
            success: false,
            error: 'Failed to fetch wallet balance', 
            details: error.message,
            network: 'mainnet-beta',
            tokenProgram: 'Token 2022'
        }, { status: 500 });
    }
});