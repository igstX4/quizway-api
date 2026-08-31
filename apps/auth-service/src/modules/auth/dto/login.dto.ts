import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(1, { message: "password is required" })
  @MaxLength(72)
  password!: string;
}
