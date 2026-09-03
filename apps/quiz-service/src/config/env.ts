import { loadEnv, nodeEnvSchema, queueDriverSchema, z } from "@quizway/contracts";

/** Validated configuration for the quiz service (evaluated on import). */
export const env = loadEnv(
  z.object({
    NODE_ENV: nodeEnvSchema,
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    QUIZ_SERVICE_GRPC_PORT: z.coerce.number().int().min(1).max(65535).default(50052),
    QUEUE_DRIVER: queueDriverSchema,
    REDIS_HOST: z.string().min(1).default("localhost"),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  }),
);

export type Env = typeof env;

