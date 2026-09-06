import { Module, type Provider } from "@nestjs/common";
import { env } from "../../config/env";
import { AttemptsController } from "./attempts.controller";
import { AttemptsService } from "./attempts.service";
import {
  ATTEMPT_PUBLISHER,
  BullMqAttemptPublisher,
  LoggingAttemptPublisher,
} from "./attempt-publisher";

/**
 * The publisher implementation is chosen by `QUEUE_DRIVER`, so the domain
 * service only ever depends on the `AttemptPublisher` port.
 */
const publisherProvider: Provider =
  env.QUEUE_DRIVER === "redis" ? BullMqAttemptPublisher : LoggingAttemptPublisher;

@Module({
  controllers: [AttemptsController],
  providers: [
    AttemptsService,
    publisherProvider,
    { provide: ATTEMPT_PUBLISHER, useExisting: publisherProvider },
  ],
})
export class AttemptsModule {}
