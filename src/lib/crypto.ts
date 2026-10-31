/**
 * Industry-standard cryptographic security utilities for DARK ESPORTS.
 * Uses Web Crypto API (SubtleCrypto) for AES-256-GCM encryption,
 * PBKDF2 with SHA-256 for password hashing, and SHA-256 for integrity verification.
 */

const DEFAULT_SALT = "dark_esports_secure_salt_2026";
const PBKDF2_ITERATIONS = 100_000;

/**
 * Computes a SHA-256 hex digest of any string.
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hashes a password using PBKDF2 with SHA-256 and 100,000 iterations.
 */
export async function hashPassword(
  password: string,
  customSalt?: string
): Promise<{ hash: string; salt: string }> {
  const salt = customSalt || (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt + DEFAULT_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedKey));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return { hash, salt };
}

/**
 * Verifies a password against a stored PBKDF2 hash and salt.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const { hash } = await hashPassword(password, storedSalt);
    // Constant-length comparison
    if (hash.length !== storedHash.length) return false;
    let match = 0;
    for (let i = 0; i < hash.length; i++) {
      match |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return match === 0;
  } catch {
    return false;
  }
}

/**
 * Derives an AES-GCM key from a master key or passphrase.
 */
async function getAesGcmKey(secret?: string): Promise<CryptoKey> {
  const keySource = secret || "dark_esports_master_aes256_key_2026_gcm";
  const encoder = new TextEncoder();
  const rawHash = await crypto.subtle.digest("SHA-256", encoder.encode(keySource));
  return crypto.subtle.importKey(
    "raw",
    rawHash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts sensitive text using AES-256-GCM with a random 12-byte IV.
 * Returns a Base64-encoded string containing `iv:ciphertext`.
 */
export async function encryptData(plaintext: string, secret?: string): Promise<string> {
  try {
    const key = await getAesGcmKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(plaintext);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encodedData
    );

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
    return `${ivBase64}:${cipherBase64}`;
  } catch (err) {
    console.error("Encryption error:", err);
    throw new Error("Failed to encrypt sensitive data");
  }
}

/**
 * Decrypts an AES-256-GCM encrypted payload (`iv:ciphertext`).
 */
export async function decryptData(encryptedPayload: string, secret?: string): Promise<string> {
  try {
    const [ivBase64, cipherBase64] = encryptedPayload.split(":");
    if (!ivBase64 || !cipherBase64) {
      throw new Error("Invalid encrypted payload format");
    }

    const key = await getAesGcmKey(secret);
    const iv = new Uint8Array(atob(ivBase64).split("").map((c) => c.charCodeAt(0)));
    const cipher = new Uint8Array(atob(cipherBase64).split("").map((c) => c.charCodeAt(0)));

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      cipher
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption error:", err);
    throw new Error("Failed to decrypt data or key mismatch");
  }
}

/**
 * Masks sensitive values like phone numbers or UPI IDs for safe UI display.
 * Example: maskPhone("9876543210") => "******3210"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "N/A";
  const str = phone.trim();
  if (str.length <= 4) return str;
  return "*".repeat(str.length - 4) + str.slice(-4);
}

/**
 * Masks UPI ID.
 * Example: maskUpi("user@upi") => "us**@upi"
 */
export function maskUpi(upi?: string | null): string {
  if (!upi) return "N/A";
  const parts = upi.split("@");
  if (parts.length !== 2) return upi;
  const [handle, vpa] = parts;
  if (handle.length <= 2) return `${handle}*@${vpa}`;
  return `${handle.slice(0, 2)}${"*".repeat(handle.length - 2)}@${vpa}`;
}
