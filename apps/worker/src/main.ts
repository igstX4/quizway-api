import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap(): Promise<void> {
  // With the in-process driver there is no queue to consume: exiting with a
  // clear message beats throwing connection errors at the user.
  if (env.QUEUE_DRIVER !== "redis") {
    Logger.warn(
      "QUEUE_DRIVER=memory — the worker has nothing to consume. " +
        "Set QUEUE_DRIVER=redis (and start Redis) to process jobs here.",
      "Bootstrap",
    );
    return;
  }

  // A worker has no inbound server, so a standalone application context keeps
  // the process minimal: the queue is the only entry point.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  app.enableShutdownHooks();

  Logger.log(`worker ready, consuming queues (${env.NODE_ENV})`, "Bootstrap");
}

void bootstrap();
