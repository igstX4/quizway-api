import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import type { UserProfile } from "@quizway/contracts";
import type { Request } from "express";

/** Express request enriched by `JwtAuthGuard`. */
export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

/** Injects the validated user profile into a controller handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserProfile => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException("Authenticated user is missing from the request");
    }

    return request.user;
  },
);
