import type { Knex } from "knex";

export type AccountErasureTargetUser = {
  id: string;
  appId: string;
  email: string;
};

export type AccountErasureActor = {
  id: string;
};

export type AccountErasureContext = {
  appId: string;
  targetUser: AccountErasureTargetUser;
  actor: AccountErasureActor;
  trx: Knex.Transaction;
};

export type AccountErasureResult = {
  id: string;
  label: string;
  deleted?: Record<string, number>;
  skipped?: boolean;
  message?: string;
};

export type AccountErasureHandler = {
  id: string;
  label: string;
  order?: number;
  erase: (ctx: AccountErasureContext) => Promise<AccountErasureResult>;
};

export type RunAccountErasureInput = {
  appId: string;
  targetUserId: string;
  actorUserId: string;
  confirmationEmail: string;
};

export type RunAccountErasureResult = {
  ok: true;
  targetUserId: string;
  targetEmail: string;
  handlers: AccountErasureResult[];
};

export class AccountErasureError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AccountErasureError";
    this.code = code;
    this.status = status;
  }
}
