import { IsString, IsUUID, MinLength } from "class-validator";

export class RefreshDto {
  @IsString()
  @MinLength(10, { message: "refreshToken is required" })
  refreshToken!: string;
}

export class ValidateTokenDto {
  @IsString()
  @MinLength(10, { message: "accessToken is required" })
  accessToken!: string;
}

export class GetUserDto {
  @IsUUID("4", { message: "userId must be a UUID" })
  userId!: string;
}
