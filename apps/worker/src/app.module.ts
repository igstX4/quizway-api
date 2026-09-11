import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ATTEMPT_QUEUE } from "@quizway/contracts";
import { PrismaModule } from "@quizway/prisma";
import { env } from "./config/env";
import { AttemptGradedProcessor } from "./processors/attempt-graded.processor";

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: { host: env.REDIS_HOST, port: env.REDIS_PORT },
    }),
    BullModule.registerQueue({ name: ATTEMPT_QUEUE }),
  ],
  providers: [AttemptGradedProcessor],
})
export class AppModule {}
