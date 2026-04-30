// Utility to join class names, straight from the shadcn/ui dojo
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
