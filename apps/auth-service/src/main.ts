import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { MicroserviceOptions } from "@nestjs/microservices";
import { GrpcExceptionFilter } from "@quizway/nest-common";
import { AppModule } from "./app.module";
import { env } from "./config/env";
import { authGrpcOptions } from "./grpc-options";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    authGrpcOptions(env.AUTH_SERVICE_GRPC_PORT),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Maps HTTP-style exceptions (401/409/404 from the service layer) onto real
  // gRPC status codes and logs the cause.
  app.useGlobalFilters(new GrpcExceptionFilter());

  app.enableShutdownHooks();
  await app.listen();

  Logger.log(
    `auth-service listening on :${env.AUTH_SERVICE_GRPC_PORT} (${env.NODE_ENV})`,
    "Bootstrap",
  );
}

void bootstrap();
