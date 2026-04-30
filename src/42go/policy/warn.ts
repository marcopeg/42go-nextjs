// Simple one-time warning utility for development environments
const emitted = new Set<string>();

export function warnOnce(key: string, msg: string) {
  if (process.env.NODE_ENV === "production") return;
  if (emitted.has(key)) return;
  emitted.add(key);
  console.warn(msg);
}
