import { grpcUrlSchema, loadEnv, nodeEnvSchema, z } from "@quizway/contracts";

/** Validated configuration for the HTTP gateway (evaluated on import). */
export const env = loadEnv(
  z.object({
    NODE_ENV: nodeEnvSchema,
    GATEWAY_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    AUTH_SERVICE_GRPC_URL: grpcUrlSchema,
    QUIZ_SERVICE_GRPC_URL: grpcUrlSchema,
    /** Comma-separated list of browser origins allowed to call the API. */
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
  }),
);

export type Env = typeof env;
