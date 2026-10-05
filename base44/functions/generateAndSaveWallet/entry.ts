// Backend function: generateAndSaveWallet
// Uses shared solanaWallet module (tweetnacl) instead of @solana/web3.js to avoid Deno bundling issues
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { generateKeypair } from '../../shared/solanaWallet.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.wallet_address) {
             return Response.json({ success: false, message: 'User already has a wallet.' }, { status: 400 });
        }

        console.log("Starting wallet generation for user:", user.id);

        let keypair;
        let publicKey: string;
        let attempts = 0;
        const maxAttempts = 50000;

        console.log("Generating 'VIN' vanity address...");
        while (attempts < maxAttempts) {
            keypair = generateKeypair();
            publicKey = keypair.publicKeyBase58;
            attempts++;

            if (publicKey.startsWith('VIN')) {
                console.log(`Found vanity address: ${publicKey} after ${attempts} attempts`);
                break;
            }

            if (attempts % 1000 === 0) {
                console.log(`Attempted ${attempts} times, still searching...`);
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        if (!publicKey.startsWith('VIN')) {
            console.log(`Could not find VIN address after ${maxAttempts} attempts, using regular address`);
            keypair = generateKeypair();
            publicKey = keypair.publicKeyBase58;
        }

        const secretKey = Array.from(keypair.secretKey);

        console.log("Saving mainnet wallet data to user profile...");

        await base44.asServiceRole.entities.User.update(user.id, {
            wallet_address: publicKey,
            wallet_secret_key: secretKey,
        });

        console.log("Mainnet wallet data saved successfully:", {
            publicKey,
            hasSecretKey: secretKey && secretKey.length > 0,
            secretKeyLength: secretKey.length,
            isVanity: publicKey.startsWith('VIN')
        });

        return Response.json({
            success: true,
            message: publicKey.startsWith('VIN') ?
                "Vanity wallet generated and saved successfully." :
                "Regular wallet generated and saved successfully.",
            wallet_address: publicKey,
            debug: {
                attempts: attempts,
                secretKeyStored: secretKey.length > 0,
                isVanity: publicKey.startsWith('VIN')
            }
        });

    } catch (error) {
        console.error('Error generating wallet:', error);
        return Response.json({
            error: 'Failed to generate wallet',
            details: error.message
        }, { status: 500 });
    }
});