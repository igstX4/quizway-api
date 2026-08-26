/**
 * Public surface of the shared Prisma package.
 *
 * `export * from "../generated/client"` re-exports the generated client types,
 * enums and the `Prisma` namespace, so a service only ever needs
 * `import { Prisma, QuizStatus } from "@quizway/prisma"`.
 */
export * from "../generated/client";
export * from "./prisma.module";
export * from "./prisma.service";
