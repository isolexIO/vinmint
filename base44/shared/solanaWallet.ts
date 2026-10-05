// Shared Solana utilities that avoid @solana/web3.js (which has a Deno bundling issue with rpc-websockets).
// Uses tweetnacl for Ed25519 keypair generation and direct RPC fetch calls for blockchain reads.

import nacl from "npm:tweetnacl@1.0.3";

const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// --- Base58 encode/decode ---
export function base58Encode(bytes: Uint8Array): string {
  let result = "";
  let num = 0n;
  for (const byte of bytes) {
    num = (num << 8n) | BigInt(byte);
  }
  while (num > 0n) {
    const remainder = num % 58n;
    result = BASE58_ALPHABET[Number(remainder)] + result;
    num = num / 58n;
  }
  for (const byte of bytes) {
    if (byte === 0) {
      result = "1" + result;
    } else {
      break;
    }
  }
  return result;
}

export function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [];
  let num = 0n;
  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base58 character: ${char}`);
    num = num * 58n + BigInt(index);
  }
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num = num >> 8n;
  }
  for (const char of str) {
    if (char === "1") {
      bytes.unshift(0);
    } else {
      break;
    }
  }
  return new Uint8Array(bytes);
}

// --- Keypair generation (Ed25519, same as Solana) ---
export interface SolanaKeypair {
  publicKey: Uint8Array; // 32 bytes
  secretKey: Uint8Array; // 64 bytes (seed + public key)
  publicKeyBase58: string;
}

export function generateKeypair(): SolanaKeypair {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    publicKeyBase58: base58Encode(keyPair.publicKey),
  };
}

export function keypairFromSecretKey(secretKey: Uint8Array): SolanaKeypair {
  // tweetnacl expects the 64-byte secret key (seed + public key)
  const keyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    publicKeyBase58: base58Encode(keyPair.publicKey),
  };
}

// --- PublicKey validation ---
export function isValidPublicKey(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  // Solana addresses are 32-44 base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// --- RPC helpers ---
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(SOLANA_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || `RPC error: ${method}`);
  }
  return data.result;
}

export async function getBalance(address: string): Promise<number> {
  const result: any = await rpcCall("getBalance", [address, { commitment: "confirmed" }]);
  return (result?.value || 0) / 1_000_000_000;
}

export async function getTokenAccountsByOwner(
  ownerAddress: string,
  mintAddress: string
): Promise<{ amount: number; decimals: number; address: string } | null> {
  try {
    const result: any = await rpcCall("getTokenAccountsByOwner", [
      ownerAddress,
      { mint: mintAddress },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ]);
    if (result?.value && result.value.length > 0) {
      const account = result.value[0];
      const parsedInfo = account.account?.data?.parsed?.info;
      if (parsedInfo?.tokenAmount) {
        return {
          amount: Number(parsedInfo.tokenAmount.amount || 0),
          decimals: parsedInfo.tokenAmount.decimals || 6,
          address: account.pubkey,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSignaturesForAddress(
  address: string,
  limit: number = 10
): Promise<any[]> {
  const result: any = await rpcCall("getSignaturesForAddress", [
    address,
    { limit },
  ]);
  return result || [];
}

export async function getParsedTransactions(
  signatures: string[]
): Promise<any[]> {
  if (signatures.length === 0) return [];
  const result: any = await rpcCall("getParsedTransactions", [
    signatures,
    { maxSupportedTransactionVersion: 0 },
  ]);
  return result || [];
}

export async function getLatestBlockhash(): Promise<string> {
  const result: any = await rpcCall("getLatestBlockhash", [
    { commitment: "confirmed" },
  ]);
  return result?.value?.blockhash || "";
}

export async function sendRawTransaction(
  base64Transaction: string
): Promise<string> {
  const result: any = await rpcCall("sendTransaction", [
    base64Transaction,
    { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed" },
  ]);
  return result || "";
}

export async function getMinimumBalanceForRentExemption(
  dataLength: number
): Promise<number> {
  const result: any = await rpcCall("getMinimumBalanceForRentExemption", [
    dataLength,
  ]);
  return result || 0;
}

// --- Raw transaction builder (avoids @solana/web3.js) ---

// Compact-u16 encoding (Solana's variable-length integer)
function encodeCompactU16(value: number): number[] {
  const bytes: number[] = [];
  let v = value;
  while (true) {
    let elem = v & 0x7f;
    v >>= 7;
    if (v === 0) {
      bytes.push(elem);
      break;
    } else {
      elem |= 0x80;
      bytes.push(elem);
    }
  }
  return bytes;
}

// Write uint64 little-endian
function writeUint64LE(value: number | bigint): number[] {
  const bigVal = BigInt(value);
  const bytes: number[] = [];
  for (let i = 0; i < 8; i++) {
    bytes.push(Number((bigVal >> BigInt(i * 8)) & 0xffn));
  }
  return bytes;
}

// System Program ID (all zeros)
const SYSTEM_PROGRAM_ID = new Uint8Array(32);

// Token-2022 Program ID
const TOKEN_2022_PROGRAM_ID = base58Decode("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

// Associated Token Account Program ID
const ASSOCIATED_TOKEN_PROGRAM_ID = base58Decode("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// Build a SystemProgram.transfer instruction
function systemTransferInstruction(fromIndex: number, toIndex: number, lamports: number): RawInstruction {
  // Instruction type = 2 (Transfer), uint32 LE
  const data = [
    2, 0, 0, 0, // Transfer instruction type (uint32 LE)
    ...writeUint64LE(lamports),
  ];
  return {
    programIdIndex: 0, // placeholder, will be set by caller
    accounts: [fromIndex, toIndex],
    data: new Uint8Array(data),
  };
}

// Build a Token transferChecked instruction (for Token-2022)
function tokenTransferCheckedInstruction(
  sourceIndex: number,
  mintIndex: number,
  destIndex: number,
  ownerIndex: number,
  amount: number,
  decimals: number
): RawInstruction {
  // Instruction type = 12 (TransferChecked), uint8
  const data = [
    12, // TransferChecked instruction type
    ...writeUint64LE(amount),
    decimals,
  ];
  return {
    programIdIndex: 0, // placeholder
    accounts: [sourceIndex, mintIndex, destIndex, ownerIndex],
    data: new Uint8Array(data),
  };
}

interface RawInstruction {
  programIdIndex: number;
  accounts: number[];
  data: Uint8Array;
}

// Build the transaction message bytes
function buildTransactionMessage(
  accountKeys: Uint8Array[],
  signerCount: number,
  readonlySignedCount: number,
  readonlyUnsignedCount: number,
  blockhashBytes: Uint8Array,
  instructions: RawInstruction[]
): Uint8Array {
  // Header (3 bytes)
  const header = [signerCount, readonlySignedCount, readonlyUnsignedCount];

  // Account keys (compact array of 32-byte arrays)
  const accountKeysFlat: number[] = [];
  for (const key of accountKeys) {
    accountKeysFlat.push(...key);
  }
  const accountKeysEncoded = [...encodeCompactU16(accountKeys.length), ...accountKeysFlat];

  // Instructions (compact array)
  let instructionsEncoded = encodeCompactU16(instructions.length);
  for (const inst of instructions) {
    const instBytes = [
      inst.programIdIndex,
      ...encodeCompactU16(inst.accounts.length),
      ...inst.accounts,
      ...encodeCompactU16(inst.data.length),
      ...inst.data,
    ];
    instructionsEncoded = [...instructionsEncoded, ...instBytes];
  }

  return new Uint8Array([...header, ...accountKeysEncoded, ...blockhashBytes, ...instructionsEncoded]);
}

// Sign and send a transaction with a single signer
export async function signAndSendTransaction(
  signerKeypair: SolanaKeypair,
  accountKeys: Uint8Array[],
  instructions: RawInstruction[],
  signerCount: number = 1,
  readonlySignedCount: number = 0,
  readonlyUnsignedCount: number = 0
): Promise<string> {
  // Get latest blockhash
  const blockhash = await getLatestBlockhash();
  if (!blockhash) {
    throw new Error("Failed to get latest blockhash");
  }
  const blockhashBytes = base58Decode(blockhash);

  // Build message
  const message = buildTransactionMessage(
    accountKeys,
    signerCount,
    readonlySignedCount,
    readonlyUnsignedCount,
    blockhashBytes,
    instructions
  );

  // Sign message
  const signature = nacl.sign.detached(message, signerKeypair.secretKey);

  // Serialize transaction: [signature count (compact-u16), signature (64 bytes), message]
  const serialized = new Uint8Array([
    ...encodeCompactU16(1),
    ...signature,
    ...message,
  ]);

  // Base64 encode
  const base64 = btoa(String.fromCharCode(...serialized));

  // Send via RPC
  return await sendRawTransaction(base64);
}

// Transfer SOL from one wallet to another
export async function transferSol(
  fromKeypair: SolanaKeypair,
  toAddress: string,
  solAmount: number
): Promise<string> {
  const lamports = Math.floor(solAmount * 1_000_000_000);
  const toPubkey = base58Decode(toAddress);

  // Account order: [signer (from), readonly unsigned (to), readonly unsigned (system program)]
  const accountKeys: Uint8Array[] = [
    fromKeypair.publicKey, // 0: signer, writable
    toPubkey,               // 1: writable, not signer
    SYSTEM_PROGRAM_ID,      // 2: readonly, not signer
  ];

  const instruction = systemTransferInstruction(0, 1, lamports);
  instruction.programIdIndex = 2; // System Program

  return await signAndSendTransaction(
    fromKeypair,
    accountKeys,
    [instruction],
    1,   // 1 required signature
    0,   // 0 readonly signed
    1    // 1 readonly unsigned (system program)
  );
}

// Transfer VIN tokens (Token-2022) using transferChecked
export async function transferVinTokens(
  fromKeypair: SolanaKeypair,
  fromTokenAccountAddress: string,
  toTokenAccountAddress: string,
  mintAddress: string,
  amount: number,
  decimals: number = 6
): Promise<string> {
  const fromTokenAccount = base58Decode(fromTokenAccountAddress);
  const toTokenAccount = base58Decode(toTokenAccountAddress);
  const mintPubkey = base58Decode(mintAddress);

  // Account order: [signer (owner), writable (source), readonly (mint), writable (dest), readonly (token program)]
  const accountKeys: Uint8Array[] = [
    fromKeypair.publicKey,  // 0: signer, owner of source
    fromTokenAccount,       // 1: writable, source
    mintPubkey,             // 2: readonly, mint
    toTokenAccount,         // 3: writable, destination
    TOKEN_2022_PROGRAM_ID,  // 4: readonly, token program
  ];

  const instruction = tokenTransferCheckedInstruction(1, 2, 3, 0, amount, decimals);
  instruction.programIdIndex = 4; // Token-2022 Program

  return await signAndSendTransaction(
    fromKeypair,
    accountKeys,
    [instruction],
    1,   // 1 required signature
    0,   // 0 readonly signed
    2    // 2 readonly unsigned (mint, token program)
  );
}

export { SOLANA_RPC_URL, TOKEN_2022_PROGRAM_ID };