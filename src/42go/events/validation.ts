import type { TClientEventInput, TEventJson } from "@/42go/events/types";

export const EVENT_NAME_MAX_LENGTH = 120;
export const EVENT_BATCH_MAX_SIZE = 50;
export const EVENT_PAYLOAD_MAX_BYTES = 16 * 1024;
export const EVENT_DEFAULT_BATCH_SIZE = 10;
export const EVENT_DEFAULT_FLUSH_INTERVAL_MS = 5_000;

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

export const isPlainEventObject = (value: unknown): value is TEventJson =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.prototype.toString.call(value) === "[object Object]";

export const normalizeEventObject = (value: unknown): TEventJson => {
  if (value == null) return {};
  if (!isPlainEventObject(value)) {
    throw new Error("Event data and meta must be JSON objects.");
  }
  return JSON.parse(JSON.stringify(value)) as TEventJson;
};

export const validateEventName = (name: unknown) => {
  if (typeof name !== "string") {
    throw new Error("Event name must be a string.");
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Event name is required.");
  }

  if (trimmed.length > EVENT_NAME_MAX_LENGTH) {
    throw new Error(`Event name must be ${EVENT_NAME_MAX_LENGTH} characters or fewer.`);
  }

  if (!EVENT_NAME_PATTERN.test(trimmed)) {
    throw new Error("Event name must use lowercase dot or dash namespace syntax.");
  }

  return trimmed;
};

export const normalizeEventAt = (value: unknown) => {
  if (value == null || value === "") return new Date();
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("Event timestamp is invalid.");
    return value;
  }
  if (typeof value !== "string") {
    throw new Error("Event timestamp must be an ISO string.");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Event timestamp is invalid.");
  return date;
};

export const assertPayloadSize = (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value ?? {})).length;
  if (bytes > EVENT_PAYLOAD_MAX_BYTES) {
    throw new Error(`Event payload must be ${EVENT_PAYLOAD_MAX_BYTES} bytes or smaller.`);
  }
};

export const normalizeClientEvents = (value: unknown): TClientEventInput[] => {
  const source = isPlainEventObject(value) ? value.events : value;
  if (!Array.isArray(source)) {
    throw new Error("Event batch must be an array.");
  }

  if (source.length === 0) {
    throw new Error("Event batch cannot be empty.");
  }

  if (source.length > EVENT_BATCH_MAX_SIZE) {
    throw new Error(`Event batch cannot contain more than ${EVENT_BATCH_MAX_SIZE} events.`);
  }

  return source.map((item) => {
    if (!isPlainEventObject(item)) {
      throw new Error("Each event must be a JSON object.");
    }

    const event = {
      name: validateEventName(item.name),
      eventAt:
        typeof item.eventAt === "string" || item.eventAt === null
          ? item.eventAt
          : undefined,
      data: normalizeEventObject(item.data),
      meta: normalizeEventObject(item.meta),
    };

    assertPayloadSize(event.data);
    assertPayloadSize(event.meta);

    return event;
  });
};
