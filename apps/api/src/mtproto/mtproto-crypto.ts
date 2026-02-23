import * as crypto from "crypto";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.MTPROTO_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "MTPROTO_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(keyHex, "hex");
}

export function getApiCredentials(): { apiId: number; apiHash: string } {
  const apiId = parseInt(process.env.TELEGRAM_API_ID ?? "", 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  if (!apiId || !apiHash) {
    throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH are required");
  }
  return { apiId, apiHash };
}

/** Шифрует строку AES-256-CBC. Формат: iv_hex:ciphertext_hex */
export function encryptSession(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/** Расшифровывает строку, зашифрованную через encryptSession */
export function decryptSession(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted data format");
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], "hex");
  const ciphertext = Buffer.from(parts[1], "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

export function createClient(sessionString?: string): TelegramClient {
  const { apiId, apiHash } = getApiCredentials();
  const session = new StringSession(sessionString ?? "");
  return new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 1,
    retryDelay: 1000,
    autoReconnect: false,
  });
}

export function createClientFromEncrypted(encryptedSessionData: string): TelegramClient {
  const sessionString = decryptSession(encryptedSessionData);
  return createClient(sessionString);
}
