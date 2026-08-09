export const dynamic = "force-dynamic";

export const GET = () => {
  const version = process.env.APP_VERSION;

  if (!version) {
    return new Response("version unavailable\n", { status: 500 });
  }

  return new Response(`${version}\n`, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
