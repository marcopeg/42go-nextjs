import "server-only";

import type { AccountErasureHandler } from "@/42go/users/account-erasure/types";

export const accountErasureHandlers: AccountErasureHandler[] = [
  {
    id: "quickshare.account-erasure",
    label: "QuickShare data",
    order: 110,
    erase: async ({ appId, targetUser, trx }) => {
      const accountIds = await trx("quickshare.accounts")
        .where({ app_id: appId, user_id: targetUser.id })
        .pluck("id");
      const deletedAccounts = accountIds.length
        ? await trx("quickshare.accounts").whereIn("id", accountIds).delete()
        : 0;
      return { id: "quickshare.account-erasure", label: "QuickShare data", deleted: { accounts: deletedAccounts } };
    },
  },
];
