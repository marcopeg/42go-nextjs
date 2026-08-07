import "server-only";

import type { AccountErasureHandler } from "@/42go/users/account-erasure/types";

export const accountErasureHandlers: AccountErasureHandler[] = [
  {
    id: "lingocafe.account-erasure",
    label: "LingoCafe reading state",
    order: 100,
    erase: async ({ targetUser, trx }) => {
      const deletedConversationReads = await trx(
        "lingocafe.conversation_reads"
      )
        .where({ user_id: targetUser.id })
        .delete();

      const deletedConversationStars = await trx(
        "lingocafe.conversation_stars"
      )
        .where({ user_id: targetUser.id })
        .delete();

      const deletedProgress = await trx("lingocafe.books_progress")
        .where({ user_id: targetUser.id })
        .delete();

      return {
        id: "lingocafe.account-erasure",
        label: "LingoCafe reading state",
        deleted: {
          conversationReads: deletedConversationReads,
          conversationStars: deletedConversationStars,
          booksProgress: deletedProgress,
        },
      };
    },
  },
];
