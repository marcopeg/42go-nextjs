export type {
  TClientEventInput,
  TEventJson,
  TEventsConfig,
  TRecordEventBatchInput,
  TRecordEventInput,
} from "@/42go/events/types";
export {
  EVENT_BATCH_MAX_SIZE,
  EVENT_DEFAULT_BATCH_SIZE,
  EVENT_DEFAULT_FLUSH_INTERVAL_MS,
  EVENT_NAME_MAX_LENGTH,
  EVENT_PAYLOAD_MAX_BYTES,
  isPlainEventObject,
  normalizeClientEvents,
  validateEventName,
} from "@/42go/events/validation";
