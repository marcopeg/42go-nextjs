import "server-only";

export const quickShareApiJson = (data: unknown, init?: ResponseInit) =>
  Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });

export const quickShareApiError = (
  status: number,
  error: string,
  message: string
) => quickShareApiJson({ error, message }, { status });
