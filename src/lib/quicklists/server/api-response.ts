export const quicklistApiError = (
  status: number,
  error: string,
  message: string
) =>
  Response.json(
    {
      error,
      message,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );

export const quicklistApiJson = (data: unknown, init?: ResponseInit) =>
  Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
