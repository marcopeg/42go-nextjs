import type { NextRequest } from "next/server";

/**
 * Abstract headers interface that normalizes access to headers
 * from both NextRequest and Headers (from next/headers)
 */
export interface AbstractHeaders {
  get(name: string): string | null;
  has(name: string): boolean;
  host?: string;
  url?: string;
}

/**
 * Convert NextRequest to AbstractHeaders
 * Used in API routes and middleware contexts
 */
export const fromNextRequest = (req: NextRequest): AbstractHeaders => ({
  get: (name: string) => req.headers.get(name),
  has: (name: string) => req.headers.has(name),
  host: req.headers.get("host") || undefined,
  url: req.url,
});

/**
 * Convert Headers (from next/headers) to AbstractHeaders
 * Used in server components and other server-side contexts
 */
export const fromHeaders = (headers: Headers): AbstractHeaders => ({
  get: (name: string) => headers.get(name),
  has: (name: string) => headers.has(name),
  host: headers.get("host") || undefined,
  // URL is not available in this context, matchers should handle gracefully
  url: undefined,
});
