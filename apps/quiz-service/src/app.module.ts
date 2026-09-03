import { BullModule } from "@nestjs/bullmq";
import { Module, type DynamicModule } from "@nestjs/common";
import { ATTEMPT_QUEUE } from "@quizway/contracts";
import { PrismaModule } from "@quizway/prisma";
import { env } from "./config/env";
import { AttemptsModule } from "./modules/attempts/attempts.module";
import { QuizzesModule } from "./modules/quizzes/quizzes.module";

/**
 * BullMQ is only wired up when a queue driver is actually configured.
 *
 * With `QUEUE_DRIVER=memory` (the default) the service boots with no Redis
 * connection, so `npm run dev:quiz` works on a machine without any server.
 */
const queueModules: DynamicModule[] =
  env.QUEUE_DRIVER === "redis"
    ? [
        BullModule.forRoot({
          connection: { host: env.REDIS_HOST, port: env.REDIS_PORT },
        }),
        BullModule.registerQueue({ name: ATTEMPT_QUEUE }),
      ]
    : [];

@Module({
  imports: [PrismaModule, ...queueModules, QuizzesModule, AttemptsModule],
})
export class AppModule {}
