// Backend function: getSolanaTransactions
// Uses shared solanaWallet module (direct RPC fetch) instead of @solana/web3.js

import { getSignaturesForAddress, getParsedTransactions } from '../../shared/solanaWallet.ts';

export default async function(req) {
    console.log("getSolanaTransactions function invoked.");
    try {
        // Public blockchain history only. This does not authorize any private record access.
        const { walletAddress, limit = 10 } = await req.json();
        if (typeof walletAddress !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
            return Response.json({ error: 'A valid Solana wallet address is required' }, { status: 400 });
        }
        if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
            return Response.json({ error: 'History limit must be between 1 and 20' }, { status: 400 });
        }

        console.log(`Fetching transaction history for: ${walletAddress}`);

        const signatures = await getSignaturesForAddress(walletAddress, limit);
        console.log(`Found ${signatures.length} transaction signatures. Fetching details...`);

        if (signatures.length === 0) {
            return Response.json({ success: true, transactions: [], count: 0, network: 'mainnet-beta' });
        }

        const signatureStrings = signatures.map((sig) => sig.signature);

        // Chunk to avoid rate limits
        const chunkSize = 5;
        const chunks = [];
        for (let i = 0; i < signatureStrings.length; i += chunkSize) {
            chunks.push(signatureStrings.slice(i, i + chunkSize));
        }

        let allParsedTransactions = [];
        for (const chunk of chunks) {
            try {
                const parsedChunk = await getParsedTransactions(chunk);
                allParsedTransactions.push(...parsedChunk);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                console.warn(`A chunk of transactions failed to load: ${e.message}`);
                allParsedTransactions.push(...Array(chunk.length).fill(null));
            }
        }

        const transactions = allParsedTransactions.map((tx, index) => {
            if (!tx) return null;

            const walletAccountIndex = tx.transaction.message.accountKeys.findIndex(
                (key) => key.pubkey === walletAddress
            );

            let balanceChange = 0;
            if (walletAccountIndex !== -1 && tx.meta) {
                const preBalance = tx.meta.preBalances[walletAccountIndex];
                const postBalance = tx.meta.postBalances[walletAccountIndex];
                if (preBalance !== null && postBalance !== null) {
                    balanceChange = (postBalance - preBalance) / 1_000_000_000;
                }
            }

            return {
                signature: signatures[index].signature,
                blockTime: tx.blockTime,
                slot: tx.slot,
                status: tx.meta.err ? 'failed' : 'success',
                balanceChange: balanceChange,
            };
        }).filter(Boolean);

        return Response.json({
            success: true,
            transactions,
            count: transactions.length,
            network: 'mainnet-beta'
        });

    } catch (error) {
        console.error('Error fetching Solana transactions:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch transaction history',
            details: error.message
        }, { status: 500 });
    }
}