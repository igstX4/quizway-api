import { join } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

export { z };

export interface EnvIssue {
  path: string;
  message: string;
}

/**
 * `.env` candidates, tried in order.
 *
 * npm workspaces run scripts with the workspace folder as `cwd`, so a single
 * root `.env` has to be discovered from `apps/<name>` and `packages/<name>` too.
 */
const DOTENV_CANDIDATES = [
  join(process.cwd(), ".env"),
  join(process.cwd(), "..", ".env"),
  join(process.cwd(), "..", "..", ".env"),
];

/** Thrown when `process.env` does not satisfy an app's schema. */
export class EnvValidationError extends Error {
  readonly issues: EnvIssue[];

  constructor(issues: EnvIssue[]) {
    super(
      `Invalid environment:\n${issues
        .map((issue) => `  - ${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

export interface LoadEnvOptions {
  /** Set to `false` in tests to skip reading a `.env` file. */
  loadDotenvFile?: boolean;
}

/**
 * Loads `.env` (when present) and validates `process.env` against `schema`.
 *
 * Called at module scope by every service so misconfiguration crashes the
 * process at boot with a readable report instead of failing on first request.
 */
export function loadEnv<T extends z.ZodTypeAny>(
  schema: T,
  options: LoadEnvOptions = {},
): z.infer<T> {
  if (options.loadDotenvFile !== false) {
    // No-op for variables that are already exported (docker, CI, k8s).
    loadDotenv({ path: DOTENV_CANDIDATES, quiet: true });
  }

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    throw new EnvValidationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
    );
  }

  return parsed.data;
}

/** `host:port` string used by every gRPC client and server binding. */
export const grpcUrlSchema = z
  .string()
  .regex(/^[\w.-]+:\d{1,5}$/, "Expected a host:port value, e.g. localhost:50051");

export const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

/**
 * Where background jobs go.
 *
 * `memory` runs everything in-process: no Redis is required, which keeps local
 * development to "clone, install, run". `redis` enables the real BullMQ queue
 * and the standalone worker.
 */
export const queueDriverSchema = z
  .enum(["memory", "redis"])
  .default("memory");

export type QueueDriver = z.infer<typeof queueDriverSchema>;
