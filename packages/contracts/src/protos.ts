import { join } from "node:path";

export type ProtoName = "auth" | "quiz";

/**
 * Absolute paths to the proto files shipped with this package.
 *
 * They live outside `src/` on purpose, so `tsc` never has to copy them: the
 * compiled `dist/protos.js` resolves the sibling `protos/` directory.
 */
export const PROTO_PATHS: Record<ProtoName, string> = {
  auth: join(__dirname, "..", "protos", "auth.proto"),
  quiz: join(__dirname, "..", "protos", "quiz.proto"),
};

export function getProtoPath(name: ProtoName): string {
  return PROTO_PATHS[name];
}

/** Proto `package` declarations, shared by every server and client. */
export const GRPC_PACKAGES: Record<ProtoName, string> = {
  auth: "quizway.auth.v1",
  quiz: "quizway.quiz.v1",
};

/**
 * Loader options shared by servers and clients.
 *
 * `defaults` keeps decoded objects predictable (no missing keys) and camelCase
 * conversion lets the TypeScript interfaces above stay idiomatic.
 */
export const GRPC_LOADER_OPTIONS = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
} as const;

