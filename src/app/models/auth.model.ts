// Mirrors the Accounts API contract (docs/accounts-api-contract.md).

export interface LoginRequest {
  email: string;
  password: string;
}

// The accounts API only accepts email + password on registration.
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface Account {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface ApiError {
  code: string;
  message: string;
}
