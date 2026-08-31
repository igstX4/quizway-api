import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "@quizway/prisma";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ global: true }),
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
