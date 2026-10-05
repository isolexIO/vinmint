// Shared Solana utilities that avoid @solana/web3.js (which has a Deno bundling issue with rpc-websockets).
// Uses tweetnacl for Ed25519 keypair generation and direct RPC fetch calls for blockchain reads.

import nacl from "npm:tweetnacl@1.0.3";
import { secrets } from "base44:runtime";

function getRpcUrl(): string {
  return secrets.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
}
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
  const response = await fetch(getRpcUrl(), {
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

// --- PDA (Program Derived Address) derivation ---
// Needed to compute Associated Token Account addresses without @solana/web3.js

const ED25519_P = 2n ** 255n - 19n;

function mod(a: bigint, m: bigint): bigint {
  return ((a % m) + m) % m;
}

function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [mod(a, m), m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return mod(oldS, m);
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n;
  base = mod(base, m);
  while (exp > 0n) {
    if (exp & 1n) result = mod(result * base, m);
    exp >>= 1n;
    base = mod(base * base, m);
  }
  return result;
}

// Ed25519 curve check: returns true if the 32-byte hash is a valid curve point
// For PDA derivation we want a point that is NOT on the curve.
const ED25519_D = mod(-121665n * modInverse(121666n, ED25519_P), ED25519_P);

function isOnCurve(hash: Uint8Array): boolean {
  // Parse y coordinate (little-endian, clear sign bit on byte[31])
  let y = 0n;
  for (let i = 31; i >= 0; i--) {
    let byteVal = BigInt(hash[i]);
    if (i === 31) byteVal &= 0x7fn;
    y = y * 256n + byteVal;
  }
  const y2 = mod(y * y, ED25519_P);
  const u = mod(y2 - 1n, ED25519_P);
  const v = mod(ED25519_D * y2 + 1n, ED25519_P);
  if (v === 0n) return false;
  const x2 = mod(u * modInverse(v, ED25519_P), ED25519_P);
  // Euler's criterion: x2 is a QR iff x2^((p-1)/2) == 1
  const legendre = modPow(x2, (ED25519_P - 1n) / 2n, ED25519_P);
  return legendre === 1n;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(buf);
}

export async function findProgramAddress(
  seeds: Uint8Array[],
  programId: Uint8Array
): Promise<Uint8Array> {
  for (let bump = 255; bump >= 0; bump--) {
    const totalLen =
      seeds.reduce((s, seed) => s + seed.length, 0) + 1 + programId.length;
    const data = new Uint8Array(totalLen);
    let offset = 0;
    for (const seed of seeds) {
      data.set(seed, offset);
      offset += seed.length;
    }
    data.set([bump], offset);
    offset += 1;
    data.set(programId, offset);
    const hash = await sha256(data);
    if (!isOnCurve(hash)) {
      return hash;
    }
  }
  throw new Error("Unable to find program address");
}

// Compute the Associated Token Account address for a given owner + mint
export async function getAssociatedTokenAddress(
  ownerAddress: string,
  mintAddress: string
): Promise<string> {
  const owner = base58Decode(ownerAddress);
  const mint = base58Decode(mintAddress);
  const ata = await findProgramAddress(
    [owner, TOKEN_2022_PROGRAM_ID, mint],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return base58Encode(ata);
}

// Build a CreateAssociatedTokenAccountIdempotent instruction
function createAtaInstruction(
  payerIndex: number,
  ataIndex: number,
  ownerIndex: number,
  mintIndex: number,
  systemProgramIndex: number,
  tokenProgramIndex: number
): RawInstruction {
  return {
    programIdIndex: 0, // set by caller
    accounts: [payerIndex, ataIndex, ownerIndex, mintIndex, systemProgramIndex, tokenProgramIndex],
    data: new Uint8Array([1]), // CreateAssociatedTokenAccountIdempotent
  };
}

// Transfer VIN tokens from vault to user, creating the user's ATA if it doesn't exist.
// This is a single atomic transaction: [createATA (idempotent), transferChecked].
export async function transferVinTokensWithATA(
  vaultKeypair: SolanaKeypair,
  vaultTokenAccountAddress: string,
  userWalletAddress: string,
  userAtaAddress: string,
  mintAddress: string,
  amount: number,
  decimals: number = 6
): Promise<string> {
  const vaultTokenAccount = base58Decode(vaultTokenAccountAddress);
  const userAta = base58Decode(userAtaAddress);
  const userWallet = base58Decode(userWalletAddress);
  const mintPubkey = base58Decode(mintAddress);

  // Account order: writable signer, writable non-signer, readonly non-signer
  // 0: vault (signer, writable) - payer + token owner
  // 1: vault token account (writable, non-signer) - source
  // 2: user ATA (writable, non-signer) - destination (may be created)
  // 3: user wallet (readonly, non-signer) - ATA owner
  // 4: mint (readonly, non-signer)
  // 5: system program (readonly, non-signer)
  // 6: token-2022 program (readonly, non-signer)
  // 7: ATA program (readonly, non-signer)
  const accountKeys: Uint8Array[] = [
    vaultKeypair.publicKey,
    vaultTokenAccount,
    userAta,
    userWallet,
    mintPubkey,
    SYSTEM_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  ];

  const createAta = createAtaInstruction(0, 2, 3, 4, 5, 6);
  createAta.programIdIndex = 7; // ATA program

  const transfer = tokenTransferCheckedInstruction(1, 4, 2, 0, amount, decimals);
  transfer.programIdIndex = 6; // Token-2022 program

  return await signAndSendTransaction(
    vaultKeypair,
    accountKeys,
    [createAta, transfer],
    1, // 1 required signature (vault)
    0, // 0 readonly signed
    5  // 5 readonly unsigned (user wallet, mint, system, token program, ATA program)
  );
}

// Verify a transaction was confirmed on-chain
export async function confirmTransaction(
  signature: string,
  maxRetries: number = 10
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result: any = await rpcCall("getSignatureStatuses", [[signature]]);
      const status = result?.value?.[0];
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        return true;
      }
      if (status?.err) {
        return false;
      }
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

export { getRpcUrl as SOLANA_RPC_URL, TOKEN_2022_PROGRAM_ID };