import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { MicroserviceOptions } from "@nestjs/microservices";
import { GrpcExceptionFilter } from "@quizway/nest-common";
import { AppModule } from "./app.module";
import { env } from "./config/env";
import { quizServerOptions } from "./grpc-options";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    quizServerOptions(env.QUIZ_SERVICE_GRPC_PORT),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip unknown fields: a caller must not be able to inject extra state.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Maps HTTP-style exceptions onto real gRPC status codes and logs them;
  // without it every failure surfaces as an opaque "Internal server error".
  app.useGlobalFilters(new GrpcExceptionFilter());

  app.enableShutdownHooks();
  await app.listen();

  Logger.log(
    `quiz-service listening on :${env.QUIZ_SERVICE_GRPC_PORT} (${env.NODE_ENV})`,
    "Bootstrap",
  );
}

void bootstrap();
