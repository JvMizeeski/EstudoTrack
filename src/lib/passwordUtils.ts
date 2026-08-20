import bcrypt from 'bcryptjs';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_PATTERN.test(value);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// Accepts legacy plaintext-stored passwords so existing accounts keep working;
// callers should re-hash and persist the result once a legacy match succeeds.
export async function verifyPassword(plain: string, stored: string | undefined | null): Promise<boolean> {
  if (!stored) return true;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}
