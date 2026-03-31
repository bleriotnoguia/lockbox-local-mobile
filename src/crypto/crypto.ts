import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2, pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { getRandomBytes } from 'expo-crypto';

const SALT_LENGTH = 16;
const NONCE_LENGTH = 12;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;

// In-memory cache for derived keys to avoid repeated 100K-iteration PBKDF2
// calls within a session. Key = masterHash + hex(salt), value = derived key.
const _keyCache = new Map<string, Uint8Array>();
const _KEY_CACHE_MAX = 64;

/**
 * Derives a 256-bit AES key from a password string using PBKDF2-SHA256.
 *
 * CRITICAL: The "password" parameter must be the SHA-256 hex hash of the
 * master password, NOT the raw user password. This matches the desktop
 * Rust implementation for cross-platform compatibility.
 */
function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  const cacheKey = `${password}:${bytesToHex(salt)}`;
  const cached = _keyCache.get(cacheKey);
  if (cached) return cached;

  const key = pbkdf2(sha256, password, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH,
  });

  if (_keyCache.size >= _KEY_CACHE_MAX) {
    _keyCache.delete(_keyCache.keys().next().value!);
  }
  _keyCache.set(cacheKey, key);
  return key;
}

async function deriveKeyAsync(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const cacheKey = `${password}:${bytesToHex(salt)}`;
  const cached = _keyCache.get(cacheKey);
  if (cached) return cached;

  const key = await pbkdf2Async(sha256, password, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH,
  });

  if (_keyCache.size >= _KEY_CACHE_MAX) {
    _keyCache.delete(_keyCache.keys().next().value!);
  }
  _keyCache.set(cacheKey, key);
  return key;
}

/** Clears the key cache (call on logout). */
export function clearKeyCache() {
  _keyCache.clear();
}

/**
 * Encrypts content using AES-256-GCM.
 * Returns base64(salt || nonce || ciphertext || auth_tag).
 *
 * @param content - The plaintext string to encrypt
 * @param masterHash - The SHA-256 hex hash of the master password (NOT raw password)
 */
export function encrypt(content: string, masterHash: string): string {
  const salt = getRandomBytes(SALT_LENGTH);
  const nonce = getRandomBytes(NONCE_LENGTH);
  const key = deriveKey(masterHash, salt);

  const aes = gcm(key, nonce);
  const plaintext = new TextEncoder().encode(content);
  const ciphertextWithTag = aes.encrypt(plaintext);

  const combined = new Uint8Array(SALT_LENGTH + NONCE_LENGTH + ciphertextWithTag.length);
  combined.set(salt, 0);
  combined.set(nonce, SALT_LENGTH);
  combined.set(ciphertextWithTag, SALT_LENGTH + NONCE_LENGTH);

  return uint8ToBase64(combined);
}

/**
 * Decrypts content encrypted with encrypt().
 *
 * @param encrypted - The base64 encoded encrypted string
 * @param masterHash - The SHA-256 hex hash of the master password (NOT raw password)
 */
export function decrypt(encrypted: string, masterHash: string): string {
  const combined = base64ToUint8(encrypted);

  if (combined.length < SALT_LENGTH + NONCE_LENGTH + 16) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = combined.slice(0, SALT_LENGTH);
  const nonce = combined.slice(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
  const ciphertextWithTag = combined.slice(SALT_LENGTH + NONCE_LENGTH);

  const key = deriveKey(masterHash, salt);

  const aes = gcm(key, nonce);
  const plaintext = aes.decrypt(ciphertextWithTag);

  return new TextDecoder().decode(plaintext);
}

/**
 * Decrypts content encrypted with encrypt(), asynchronously.
 */
export async function decryptAsync(encrypted: string, masterHash: string): Promise<string> {
  const combined = base64ToUint8(encrypted);

  if (combined.length < SALT_LENGTH + NONCE_LENGTH + 16) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = combined.slice(0, SALT_LENGTH);
  const nonce = combined.slice(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
  const ciphertextWithTag = combined.slice(SALT_LENGTH + NONCE_LENGTH);

  const key = await deriveKeyAsync(masterHash, salt);

  const aes = gcm(key, nonce);
  const plaintext = aes.decrypt(ciphertextWithTag);

  return new TextDecoder().decode(plaintext);
}

/**
 * Hashes a password using SHA-256 and returns hex string.
 */
export function hashPassword(password: string): string {
  const encoded = new TextEncoder().encode(password);
  return bytesToHex(sha256(encoded));
}

/**
 * Verifies a password against a stored SHA-256 hex hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

/**
 * Signs data with HMAC-SHA256. Returns hex-encoded signature.
 */
export function hmacSign(data: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const dataBytes = new TextEncoder().encode(data);
  return bytesToHex(hmac(sha256, keyBytes, dataBytes));
}

/**
 * Verifies an HMAC-SHA256 signature.
 */
export function hmacVerify(
  data: string,
  key: string,
  signature: string
): boolean {
  return hmacSign(data, key) === signature;
}

/**
 * Builds the canonical string for HMAC signing of a lockbox.
 * Must match the desktop Rust implementation exactly.
 */
export function lockboxSignData(
  name: string,
  content: string,
  unlockDelaySeconds: number,
  relockDelaySeconds: number,
  penaltyEnabled: boolean,
  penaltySeconds: number
): string {
  return `${name}|${content}|${unlockDelaySeconds}|${relockDelaySeconds}|${penaltyEnabled ? '1' : '0'}|${penaltySeconds}`;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
