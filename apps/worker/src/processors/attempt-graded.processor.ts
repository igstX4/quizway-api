import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ATTEMPT_QUEUE, type AttemptGradedJob } from "@quizway/contracts";
import { PrismaService } from "@quizway/prisma";
import type { Job } from "bullmq";
import { env } from "../config/env";

/**
 * Consumes `attempt.graded` jobs.
 *
 * The job exists so the request path stays fast: anything that is not needed to
 * answer the participant (audit trail, notifications, report refreshes) happens
 * here instead of inside the gRPC call.
 *
 * BullMQ guarantees at-least-once delivery, so the handler is written to be
 * idempotent — re-running it only appends another audit row.
 */
@Processor(ATTEMPT_QUEUE, { concurrency: env.WORKER_CONCURRENCY })
export class AttemptGradedProcessor extends WorkerHost {
  private readonly logger = new Logger(AttemptGradedProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AttemptGradedJob>): Promise<void> {
    const { attemptId, quizId, ownerId, score, maxScore, passed } = job.data;

    const percentage = maxScore === 0 ? 0 : score / maxScore;

    await this.prisma.auditEvent.create({
      data: {
        type: job.name,
        quizId,
        userId: ownerId,
        payload: JSON.stringify({ attemptId, score, maxScore, percentage, passed }),
      },
    });

    this.logger.log(
      `attempt ${attemptId} graded — ${score}/${maxScore} (${Math.round(percentage * 100)}%)`,
    );

    // Extension points that would live here in a larger deployment:
    //   • email the quiz owner when the pass rate drops below a threshold
    //   • push the attempt to an external BI/webhook destination
    //   • refresh a materialised analytics table
  }
}
