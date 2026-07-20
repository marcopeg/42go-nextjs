import { resolveQuicklistMode } from "@/lib/quicklists/mode";

export const quicklistApiDate = (
  value: Date | string | null | undefined
): string | null =>
  value ? (value instanceof Date ? value : new Date(value)).toISOString() : null;

export const serializeQuicklistApiList = (row: {
  id: string;
  title: string;
  settings: unknown;
  created_at: Date | string;
  updated_at: Date | string;
  owned?: boolean;
  role?: string;
}) => ({
  id: row.id,
  title: row.title,
  mode: resolveQuicklistMode(row.settings),
  ...(row.owned !== undefined ? { owned: Boolean(row.owned) } : {}),
  ...(row.role ? { role: row.role } : {}),
  createdAt: quicklistApiDate(row.created_at),
  updatedAt: quicklistApiDate(row.updated_at),
});

export const serializeQuicklistApiItem = (row: {
  id: string;
  title: string;
  position: number;
  created_at?: Date | string;
  updated_at: Date | string;
  completed_at: Date | string | null;
}) => ({
  id: row.id,
  title: row.title,
  position: row.position,
  completed: Boolean(row.completed_at),
  completedAt: quicklistApiDate(row.completed_at),
  ...(row.created_at ? { createdAt: quicklistApiDate(row.created_at) } : {}),
  updatedAt: quicklistApiDate(row.updated_at),
});
