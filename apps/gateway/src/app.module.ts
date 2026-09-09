import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/auth/jwt-auth.guard";
import { GrpcClientsModule } from "./grpc/grpc-clients.module";
import { AuthGrpcService, QuizGrpcService } from "./grpc/grpc-services";
import { AuthController } from "./modules/auth/auth.controller";
import { HealthController } from "./modules/health/health.controller";
import { QuizzesController } from "./modules/quizzes/quizzes.controller";

@Module({
  imports: [GrpcClientsModule],
  controllers: [HealthController, AuthController, QuizzesController],
  providers: [
    AuthGrpcService,
    QuizGrpcService,
    // Registered globally so protection is the default and `@Public()` opts out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
