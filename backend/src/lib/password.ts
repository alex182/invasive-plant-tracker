import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const N = 16384;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** A random password for admin-issued temporary credentials (new user, reset, QR login). */
export function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const [, nStr, saltHex, hashHex] = parts;
  const n = Number(nStr);
  const storedHash = Buffer.from(hashHex, "hex");
  const candidate = scryptSync(plain, Buffer.from(saltHex, "hex"), storedHash.length, { N: n });
  return candidate.length === storedHash.length && timingSafeEqual(candidate, storedHash);
}
