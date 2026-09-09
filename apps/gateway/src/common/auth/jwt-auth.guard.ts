import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGrpcService } from "../../grpc/grpc-services";
import {
  IS_PUBLIC_KEY,
} from "./public.decorator";
import type { AuthenticatedRequest } from "./current-user.decorator";

/**
 * Validates the bearer token by delegating to the auth service.
 *
 * The gateway deliberately holds no signing key and no user table: it only
 * forwards the token and attaches the returned profile to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthGrpcService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const accessToken = header.slice("Bearer ".length).trim();

    if (!accessToken) {
      throw new UnauthorizedException("Missing bearer token");
    }

    request.user = await this.auth.service.validateToken({ accessToken });

    return true;
  }
}
