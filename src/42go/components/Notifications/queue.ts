import type { Communication } from "@/42go/communications";

export const advanceCommunicationQueue = (items: Communication[]) =>
  items.slice(1);

export const getCommunicationQueuePosition = (
  handled: number,
  remaining: number
) => ({
  current: remaining > 0 ? handled + 1 : handled,
  total: handled + remaining,
});
