import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import {
  ATTEMPT_GRADED_JOB,
  ATTEMPT_QUEUE,
  type AttemptGradedJob,
} from "@quizway/contracts";
import type { Queue } from "bullmq";

export const ATTEMPT_PUBLISHER = "ATTEMPT_PUBLISHER";

/**
 * Port for "an attempt was graded" domain events.
 *
 * Two implementations exist so the queue stays an infrastructure detail:
 * Redis/BullMQ in a real deployment, an in-process no-op for local runs.
 */
export interface AttemptPublisher {
  publish(job: AttemptGradedJob): Promise<void>;
}

/** Publishes to BullMQ; consumed by the standalone `worker` app. */
@Injectable()
export class BullMqAttemptPublisher implements AttemptPublisher {
  constructor(
    @InjectQueue(ATTEMPT_QUEUE)
    private readonly queue: Queue<AttemptGradedJob>,
  ) {}

  async publish(job: AttemptGradedJob): Promise<void> {
    await this.queue.add(ATTEMPT_GRADED_JOB, job, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}

/**
 * Default driver (`QUEUE_DRIVER=memory`).
 *
 * Keeps the request path non-blocking without requiring Redis: the event is
 * logged and the response returns immediately, exactly like the queued version.
 */
@Injectable()
export class LoggingAttemptPublisher implements AttemptPublisher {
  private readonly logger = new Logger(LoggingAttemptPublisher.name);

  async publish(job: AttemptGradedJob): Promise<void> {
    const percentage = job.maxScore === 0 ? 0 : Math.round((job.score / job.maxScore) * 100);

    this.logger.log(
      `queue disabled (memory driver) — attempt ${job.attemptId} graded ` +
        `${job.score}/${job.maxScore} (${percentage}%). ` +
        `Set QUEUE_DRIVER=redis to process it in the worker.`,
    );
  }
}
