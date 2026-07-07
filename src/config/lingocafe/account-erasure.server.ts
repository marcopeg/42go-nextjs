import "server-only";

import type { AccountErasureHandler } from "@/42go/users/account-erasure/types";

export const accountErasureHandlers: AccountErasureHandler[] = [
  {
    id: "lingocafe.account-erasure",
    label: "LingoCafe reading state",
    order: 100,
    erase: async ({ targetUser, trx }) => {
      const deletedProgress = await trx("lingocafe.books_progress")
        .where({ user_id: targetUser.id })
        .delete();

      return {
        id: "lingocafe.account-erasure",
        label: "LingoCafe reading state",
        deleted: {
          booksProgress: deletedProgress,
        },
      };
    },
  },
];
