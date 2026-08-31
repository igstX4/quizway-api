import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(320)
  email!: string;

  /** 72 is bcrypt's effective maximum, so longer values would be truncated. */
  @IsString()
  @MinLength(8, { message: "password must be at least 8 characters long" })
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2, { message: "fullName must be at least 2 characters long" })
  @MaxLength(80)
  fullName!: string;
}
