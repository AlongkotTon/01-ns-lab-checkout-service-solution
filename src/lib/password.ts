import { randomBytes, scrypt, timingSafeEqual } from "crypto";

const SALT_BYTES = 16;
const KEY_BYTES = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/** Hash a password as "<salt hex>:<hash hex>" with a fresh random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const key = await deriveKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

/** Constant-time check of a password against a stored "<salt>:<hash>" string. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const key = await deriveKey(password, salt);
  const expected = Buffer.from(hashHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
