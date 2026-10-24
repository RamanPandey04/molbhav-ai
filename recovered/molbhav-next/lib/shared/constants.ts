export const ACTOR_ROLES = ['BUYER','MERCHANT','SUPPLIER','ADMIN'] as const;
export const PAYMENT_MODES = ['UAT','LIVE'] as const;
export const PAYMENT_STATUSES = ['CREATED','PENDING','VERIFIED_PAID','FAILED','EXPIRED'] as const;
export const AGENT_DECISIONS = ['PROPOSE','NO_DEAL','BLOCKED'] as const;
export const DEFAULT_REQUEST_TTL_MINUTES = 60;
export const MAX_QUANTITY = 100_000;
