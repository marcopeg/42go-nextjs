import type { ConversationRound } from "@/app/(app)/(lingocafe)/conversations/_components/types";

export type ConversationTurnPlacement = {
  side: "left" | "right";
  startsActorRun: boolean;
};

export const buildConversationThreadLayout = (
  rounds: Pick<ConversationRound, "actorId">[]
): ConversationTurnPlacement[] => {
  const actorSides = new Map<string, ConversationTurnPlacement["side"]>();

  return rounds.map((round, index) => {
    let side = actorSides.get(round.actorId);
    if (!side) {
      side = actorSides.size % 2 === 0 ? "left" : "right";
      actorSides.set(round.actorId, side);
    }

    return {
      side,
      startsActorRun:
        index === 0 || rounds[index - 1]?.actorId !== round.actorId,
    };
  });
};
