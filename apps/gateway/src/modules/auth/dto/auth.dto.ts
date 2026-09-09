import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterBody {
  @ApiProperty({ example: "demo@quizway.dev" })
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: "Password123!", minLength: 8 })
  @IsString()
  @MinLength(8, { message: "password must be at least 8 characters long" })
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: "Demo Owner" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName!: string;
}

export class LoginBody {
  @ApiProperty({ example: "demo@quizway.dev" })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: "Password123!" })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}

export class RefreshBody {
  @ApiPropertyOptional({ description: "Refresh token issued by /auth/login or /auth/register" })
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
