import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "qs_";
const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const TOKEN_RANDOM_LENGTH = 48;
const TOKEN_LOOKUP_LENGTH = 15;
const TOKEN_BYTE_LIMIT = Math.floor(256 / TOKEN_ALPHABET.length) * TOKEN_ALPHABET.length;

const createRandomTokenPart = (length: number): string => {
  let value = "";

  while (value.length < length) {
    const bytes = randomBytes(length - value.length);
    for (const byte of bytes) {
      if (byte >= TOKEN_BYTE_LIMIT) continue;
      value += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
      if (value.length === length) break;
    }
  }

  return value;
};

export const createQuickShareApiToken = (): string =>
  `${TOKEN_PREFIX}${createRandomTokenPart(TOKEN_RANDOM_LENGTH)}`;

export const hashQuickShareApiToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export const getQuickShareApiTokenPrefix = (token: string): string =>
  token.slice(0, TOKEN_LOOKUP_LENGTH);

export const parseQuickShareBearerToken = (header: string | null): string | null => {
  if (!header) return null;

  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  if (!match) return null;

  const token = match[1];
  return new RegExp(`^${TOKEN_PREFIX}[A-Za-z0-9_-]{${TOKEN_RANDOM_LENGTH}}$`).test(token)
    ? token
    : null;
};

export const quickShareTokenHashMatches = (
  candidateHash: string,
  storedHash: string
): boolean => {
  if (!/^[a-f0-9]{64}$/.test(candidateHash) || !/^[a-f0-9]{64}$/.test(storedHash)) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(candidateHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
};
