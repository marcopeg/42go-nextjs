export const QUICKLIST_CONNECTION_CODE_PREFIX = "qlc1_";

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

export const createQuicklistConnectionCode = (baseUrl: string, token: string) =>
  `${QUICKLIST_CONNECTION_CODE_PREFIX}${encodeBase64Url(
    JSON.stringify({ v: 1, baseUrl: new URL(baseUrl).origin, token })
  )}`;
