interface EncryptedFilePayload {
  encrypted: true;
  data: {
    salt: string;
    iv: string;
    ciphertext: string;
  };
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function isEncryptedFilePayload(value: unknown): value is EncryptedFilePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<EncryptedFilePayload>;
  return payload.encrypted === true && Boolean(payload.data && typeof payload.data === 'object');
}

export async function encryptJsonPayload(payload: unknown, password: string): Promise<unknown> {
  if (!password) return payload;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  const key = await deriveKey(password, salt);
  const cipherText = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(raw)
  );

  return {
    encrypted: true,
    data: {
      salt: toBase64(salt),
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(cipherText))
    }
  };
}

export async function decryptJsonPayload(bundle: unknown, password: string): Promise<unknown> {
  if (!isEncryptedFilePayload(bundle)) return bundle;
  if (!password) {
    throw new Error("Hasło jest wymagane do odszyfrowania pliku.");
  }

  const salt = fromBase64(bundle.data.salt);
  const iv = fromBase64(bundle.data.iv);
  const cipherText = fromBase64(bundle.data.ciphertext);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherText
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}
