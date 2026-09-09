import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthResponse, UserProfile } from "@quizway/contracts";
import { AuthGrpcService } from "../../grpc/grpc-services";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Public } from "../../common/auth/public.decorator";
import { LoginBody, RefreshBody, RegisterBody } from "./dto/auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthGrpcService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Create an account and receive a token pair" })
  register(@Body() body: RegisterBody): Promise<AuthResponse> {
    return this.auth.service.register(body);
  }

  @Public()
  @Post("login")
  @ApiOperation({ summary: "Exchange credentials for a token pair" })
  login(@Body() body: LoginBody): Promise<AuthResponse> {
    return this.auth.service.login(body);
  }

  @Public()
  @Post("refresh")
  @ApiOperation({ summary: "Rotate an expired access token" })
  refresh(@Body() body: RefreshBody): Promise<AuthResponse> {
    return this.auth.service.refresh(body);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Profile of the caller (validated by the auth service)" })
  me(@CurrentUser() user: UserProfile): UserProfile {
    // The guard already fetched the profile over gRPC, so no extra call is made.
    return user;
  }
}
