import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import {
  AUTH_SERVICE_NAME,
  type AuthResponse,
  type UserProfile,
} from "@quizway/contracts";
import { AuthService } from "./auth.service";
// DTOs must be value imports: Nest reads the parameter metadata to validate and
// transform the incoming gRPC message. `import type` would erase the class and
// make `ValidationPipe({ whitelist: true })` strip every field.
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { GetUserDto, RefreshDto, ValidateTokenDto } from "./dto/token.dto";

/**
 * gRPC edge of the auth service.
 *
 * Every method maps 1:1 to a declaration in `auth.proto`; the global
 * `ValidationPipe` in `main.ts` validates the incoming messages before the
 * service sees them.
 */
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @GrpcMethod(AUTH_SERVICE_NAME, "Register")
  register(dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, "Login")
  login(dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, "Refresh")
  refresh(dto: RefreshDto): Promise<AuthResponse> {
    return this.auth.refresh(dto);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, "ValidateToken")
  validateToken(dto: ValidateTokenDto): Promise<UserProfile> {
    return this.auth.validateToken(dto);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, "GetUser")
  getUser(dto: GetUserDto): Promise<UserProfile> {
    return this.auth.getUser(dto.userId);
  }
}
