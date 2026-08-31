import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import type { AuthResponse } from "@quizway/contracts";
import { env } from "../../config/env";

/**
 * `expiresIn` is typed as `ms`-style literal unions; our environment values are
 * plain strings, so they are narrowed once here instead of at every call site.
 */
function accessTokenOptions(): JwtSignOptions {
  return {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN as JwtSignOptions["expiresIn"],
  };
}

function refreshTokenOptions(): JwtSignOptions {
  return {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as JwtSignOptions["expiresIn"],
  };
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Signs and verifies both token types.
 *
 * Access tokens are short lived and carry the claims the gateway needs;
 * refresh tokens are long lived and only identify the subject.
 */
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  async issuePair(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<TokenPair> {
    const claims: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(claims, accessTokenOptions()),
      this.jwt.signAsync(
        { sub: user.id, type: "refresh" } satisfies RefreshTokenPayload,
        refreshTokenOptions(),
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: env.JWT_SECRET,
      });
    } catch {
      // Expired/forged tokens must never leak the underlying JWT error.
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: env.JWT_SECRET,
      });

      if (payload.type !== "refresh") {
        throw new UnauthorizedException("Invalid refresh token");
      }

      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }
}

/** Shape helper so `AuthService` never hand-builds the gRPC message. */
export function toAuthResponse(
  user: { id: string; email: string; fullName: string; role: string },
  tokens: TokenPair,
): AuthResponse {
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: new Date().toISOString(),
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
