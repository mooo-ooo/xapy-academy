import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

export const BCRYPT_COST = 12;

export function generateRandomPassword(byteLength = 12): string {
  return randomBytes(byteLength).toString("base64url");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
