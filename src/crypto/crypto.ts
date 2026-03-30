import QuickCrypto from 'react-native-quick-crypto';

const SALT_LENGTH = 16;
const NONCE_LENGTH = 12;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;

/**
 * Derives a 256-bit AES key from a password string using PBKDF2-SHA256.
 *
 * CRITICAL: The "password" parameter must be the SHA-256 hex hash of the
 * master password, NOT the raw user password. This matches the desktop
 * Rust implementation for cross-platform compatibility.
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return QuickCrypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts content using AES-256-GCM.
 * Returns base64(salt || nonce || ciphertext_with_auth_tag).
 *
 * @param content - The plaintext string to encrypt
 * @param masterHash - The SHA-256 hex hash of the master password (NOT raw password)
 */
export function encrypt(content: string, masterHash: string): string {
  const salt = QuickCrypto.randomBytes(SALT_LENGTH);
  const nonce = QuickCrypto.randomBytes(NONCE_LENGTH);
  const key = deriveKey(masterHash, salt);

  const cipher = QuickCrypto.createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([
    cipher.update(content, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([
    salt,
    nonce,
    encrypted,
    authTag,
  ]);

  return combined.toString('base64');
}

/**
 * Decrypts content encrypted with encrypt().
 *
 * @param encrypted - The base64 encoded encrypted string
 * @param masterHash - The SHA-256 hex hash of the master password (NOT raw password)
 */
export function decrypt(encrypted: string, masterHash: string): string {
  const combined = Buffer.from(encrypted, 'base64');

  if (combined.length < SALT_LENGTH + NONCE_LENGTH + 16) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = combined.subarray(0, SALT_LENGTH);
  const nonce = combined.subarray(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
  const ciphertextWithTag = combined.subarray(SALT_LENGTH + NONCE_LENGTH);

  // AES-GCM auth tag is the last 16 bytes
  const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);

  const key = deriveKey(masterHash, salt);

  const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Hashes a password using SHA-256 and returns hex string.
 * Used for master password storage and panic code hashing.
 */
export function hashPassword(password: string): string {
  const hash = QuickCrypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}

/**
 * Verifies a password against a stored SHA-256 hex hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

/**
 * Signs data with HMAC-SHA256. Returns hex-encoded signature.
 * Key should be the master password hash (hex string).
 */
export function hmacSign(data: string, key: string): string {
  const hmac = QuickCrypto.createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('hex');
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
