/**
 * 🔒 PragmaOS Cryptographic Services
 * mathematically secure client-side encryption using the native WebCrypto API.
 * Uses PBKDF2 (SHA-256, 100,000 iterations) for key derivation from PIN,
 * and AES-GCM (256-bit) for zero-knowledge data encryption/decryption.
 */

export const VAULT_VERIFY_PAYLOAD = "__pragmaos_vault_verify__";

/**
 * Converts a Uint8Array to a hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Converts a hex string to a Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) throw new Error("Invalid hex string length");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

/**
 * Generates a cryptographically secure random salt (16 bytes) in Hex format.
 */
export function generateSaltHex(): string {
    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    return bytesToHex(salt);
}

/**
 * Derives a CryptoKey (AES-GCM-256) from a user's PIN and salt using PBKDF2.
 */
export async function deriveKeyFromPin(pin: string, saltHex: string): Promise<CryptoKey> {
    const pinBuffer = new TextEncoder().encode(pin + "_pragmaos_vault_derive");
    const saltBuffer = hexToBytes(saltHex);

    // 1. Import PIN as raw key material
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        pinBuffer,
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    // 2. Derive AES-GCM-256 key
    return await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltBuffer as any,
            iterations: 100000,
            hash: "SHA-256",
        },
        baseKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false, // Key is non-extractable from memory for security
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a plaintext string using the derived key and AES-GCM.
 * Packs format as: saltHex:ivHex:ciphertextHex
 */
export async function encryptText(text: string, key: CryptoKey, saltHex: string): Promise<string> {
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv); // 12-byte cryptographically secure random IV
    const encodedText = new TextEncoder().encode(text);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv as any,
        },
        key,
        encodedText
    );

    const ivHex = bytesToHex(iv);
    const ciphertextHex = bytesToHex(new Uint8Array(ciphertextBuffer));

    return `${saltHex}:${ivHex}:${ciphertextHex}`;
}

/**
 * Decrypts a packed string using the derived key and AES-GCM.
 * Assumes format: saltHex:ivHex:ciphertextHex
 * If the string does not match the encrypted pattern, it auto-detects it
 * as a legacy plaintext note and safely returns the content as-is.
 */
export async function decryptText(encryptedString: string, key: CryptoKey): Promise<string> {
    // Packed format pattern: 32-char hex (salt), 24-char hex (iv), ciphertext hex
    const isEncrypted = /^[a-f0-9]{32}:[a-f0-9]{24}:[a-f0-9]+$/i.test(encryptedString);
    if (!isEncrypted) {
        // Safe fallback for legacy unencrypted plaintext notes
        return encryptedString;
    }

    const parts = encryptedString.split(":");
    const [, ivHex, ciphertextHex] = parts;
    const iv = hexToBytes(ivHex);
    const ciphertext = hexToBytes(ciphertextHex);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv as any,
        },
        key,
        ciphertext as any
    );

    return new TextDecoder().decode(decryptedBuffer);
}
