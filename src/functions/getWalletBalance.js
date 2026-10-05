import { base44 } from '@/api/base44Client';
import { PublicKey } from '@solana/web3.js';

const VIN_TOKEN_MINT = 'DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ATA_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

function computeATA(walletAddress) {
  try {
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(VIN_TOKEN_MINT);
    const tokenProgram = new PublicKey(TOKEN_2022_PROGRAM_ID);
    const ataProgram = new PublicKey(ATA_PROGRAM_ID);
    const [ata] = PublicKey.findProgramAddressSync(
      [wallet.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
      ataProgram
    );
    return ata.toString();
  } catch {
    return null;
  }
}

export const getWalletBalance = (payload = {}) => {
  const ataAddress = computeATA(payload.walletAddress);
  return base44.functions.invoke('getWalletBalance', { ...payload, ataAddress });
};
export default getWalletBalance;