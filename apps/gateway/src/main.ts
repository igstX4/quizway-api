import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
      credentials: true,
    },
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("QuizWay API")
      .setDescription(
        "HTTP gateway in front of the auth-service and quiz-service gRPC microservices.",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .build(),
  );

  SwaggerModule.setup("api/docs", app, document);

  await app.listen(env.GATEWAY_PORT, "0.0.0.0");

  Logger.log(
    `gateway listening on :${env.GATEWAY_PORT} — docs at /api/docs (${env.NODE_ENV})`,
    "Bootstrap",
  );
}

void bootstrap();
