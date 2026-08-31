import { loadEnv, nodeEnvSchema, z } from "@quizway/contracts";

/**
 * Validated configuration for the auth service.
 *
 * Evaluated on import: an invalid or missing secret stops the process before it
 * starts accepting gRPC traffic.
 */
export const env = loadEnv(
  z.object({
    NODE_ENV: nodeEnvSchema,
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SERVICE_GRPC_PORT: z.coerce.number().int().min(1).max(65535).default(50051),
    JWT_SECRET: z
      .string()
      .min(16, "JWT_SECRET must be at least 16 characters long"),
    JWT_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  }),
);

export type Env = typeof env;
