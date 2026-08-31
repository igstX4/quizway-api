import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthResponse, UserProfile } from "@quizway/contracts";
import type { User } from "@quizway/prisma";
import { compare, hash } from "bcrypt";
import { env } from "../../config/env";
import { UsersService } from "../users/users.service";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { RefreshDto, ValidateTokenDto } from "./dto/token.dto";
import { TokenService, toAuthResponse } from "./token.service";

function toProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await hash(dto.password, env.BCRYPT_ROUNDS);

    const user = await this.users.create({
      email,
      passwordHash,
      fullName: dto.fullName.trim(),
    });

    return toAuthResponse(user, await this.tokens.issuePair(user));
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email.trim().toLowerCase());

    // A single error for both branches: never reveal whether an email exists.
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return toAuthResponse(user, await this.tokens.issuePair(user));
  }

  async refresh(dto: RefreshDto): Promise<AuthResponse> {
    const payload = await this.tokens.verifyRefreshToken(dto.refreshToken);
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("Account no longer exists");
    }

    // Rotating the pair on every refresh limits the value of a leaked token.
    return toAuthResponse(user, await this.tokens.issuePair(user));
  }

  async validateToken(dto: ValidateTokenDto): Promise<UserProfile> {
    const payload = await this.tokens.verifyAccessToken(dto.accessToken);
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("Account no longer exists");
    }

    return toProfile(user);
  }

  async getUser(userId: string): Promise<UserProfile> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return toProfile(user);
  }
}
