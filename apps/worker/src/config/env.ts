import {
  loadEnv,
  nodeEnvSchema,
  queueDriverSchema,
  z,
} from "@quizway/contracts";

/** Validated configuration for the background worker (evaluated on import). */
export const env = loadEnv(
  z.object({
    NODE_ENV: nodeEnvSchema,
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    QUEUE_DRIVER: queueDriverSchema,
    REDIS_HOST: z.string().min(1).default("localhost"),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  }),
);

export type Env = typeof env;
