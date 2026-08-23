/**
 * TypeScript view of `auth.proto`.
 *
 * Keeping these hand-written (instead of generated) keeps the build free of a
 * protoc step while still giving every caller compile-time safety. The runtime
 * contract is enforced by the proto file itself.
 */

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ValidateTokenRequest {
  accessToken: string;
}

export interface GetUserRequest {
  userId: string;
}

/** Promise-based gRPC client surface exposed by `AuthService`. */
export interface AuthServiceClient {
  register(request: RegisterRequest): Promise<AuthResponse>;
  login(request: LoginRequest): Promise<AuthResponse>;
  refresh(request: RefreshRequest): Promise<AuthResponse>;
  validateToken(request: ValidateTokenRequest): Promise<UserProfile>;
  getUser(request: GetUserRequest): Promise<UserProfile>;
}

export const AUTH_SERVICE_NAME = "AuthService";
