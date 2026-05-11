import type { Knex } from "knex";

export type TEventJson = Record<string, unknown>;

export type TRecordEventInput = {
  appId?: string | null;
  userId: string;
  name: string;
  eventAt?: Date | string | null;
  data?: TEventJson;
  meta?: TEventJson;
  db?: Knex | Knex.Transaction;
};

export type TRecordEventBatchInput = {
  appId?: string | null;
  userId: string;
  events: Array<Omit<TRecordEventInput, "appId" | "userId" | "db">>;
  meta?: TEventJson;
  db?: Knex | Knex.Transaction;
};

export type TClientEventInput = {
  name: string;
  eventAt?: string | null;
  data?: TEventJson;
  meta?: TEventJson;
};

export type TEventsConfig = {
  enabled?: boolean;
  requireSession?: boolean;
  allowAnonymous?: boolean;
  batchSize?: number;
  flushIntervalMs?: number;
};

export type TEventRowInput = {
  app_id: string;
  user_id: string;
  event_at: Date;
  name: string;
  data: TEventJson;
  meta: TEventJson;
};
