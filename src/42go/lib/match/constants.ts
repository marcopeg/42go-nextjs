/**
 * Internal header name used to carry the resolved app name across the request lifecycle.
 * Kept inside the 42go library to avoid leaking into app-level config.
 */
export const APP_ID_HEADER = "X-42Go-AppID";
