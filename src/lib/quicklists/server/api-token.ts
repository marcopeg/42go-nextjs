import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const TOKEN_PREFIX = "ql";
const LEGACY_TOKEN_PREFIX = "ql_";
const TOKEN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_RANDOM_LENGTH = 43;
const TOKEN_BYTE_LIMIT = Math.floor(256 / TOKEN_ALPHABET.length) * TOKEN_ALPHABET.length;
const TOKEN_LOOKUP_LENGTH = 12;

const createRandomAlphanumeric = (length: number) => {
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

export const createQuicklistApiToken = (): string =>
  `${TOKEN_PREFIX}${createRandomAlphanumeric(TOKEN_RANDOM_LENGTH)}`;

export const hashQuicklistApiToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export const getQuicklistApiTokenPrefix = (token: string): string =>
  token.slice(0, TOKEN_LOOKUP_LENGTH);

export const parseQuicklistBearerToken = (header: string | null): string | null => {
  if (!header) return null;

  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  if (!match) return null;

  const token = match[1];
  const isCurrentToken =
    token.startsWith(TOKEN_PREFIX) && /^[A-Za-z0-9]+$/.test(token);
  const isLegacyToken =
    token.startsWith(LEGACY_TOKEN_PREFIX) && /^[A-Za-z0-9_-]+$/.test(token);

  return token.length > TOKEN_LOOKUP_LENGTH && (isCurrentToken || isLegacyToken)
    ? token
    : null;
};

export const quicklistTokenHashMatches = (
  candidateHash: string,
  storedHash: string
): boolean => {
  const candidate = Buffer.from(candidateHash, "hex");
  const stored = Buffer.from(storedHash, "hex");

  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
};
