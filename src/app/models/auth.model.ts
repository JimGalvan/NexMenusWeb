// Mirrors the Accounts API contract (docs/accounts-api-contract.md).

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * The version fields record which legal text the user agreed to, and are stored
 * by the API against the new account. They come from `LEGAL_VERSIONS` rather
 * than being typed in anywhere, so what is recorded is always what the signup
 * form linked to.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  termsVersion: string;
  privacyVersion: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Subscription tier. Absent on a response from an API that predates plans, so
 * every read goes through `planOf` rather than touching `account.plan` directly.
 */
export type Plan = 'FREE' | 'PRO';

export interface Account {
  id: string;
  email: string;
  /** Omitted by older API builds; treat a missing value as FREE. */
  plan?: Plan;
  /** When a PRO account is next due, or null. Billing is manual, so this is set by hand. */
  planRenewsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The tier to treat an account as. Unknown or missing always resolves to FREE:
 * the frontend must never grant Pro on its own, and the API enforces every gate
 * that matters regardless of what the client believes.
 */
export function planOf(account: Account | null): Plan {
  return account?.plan === 'PRO' ? 'PRO' : 'FREE';
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface ApiError {
  code: string;
  message: string;
}
