/**
 * Jest `setupFiles` entry.
 *
 * `config/env.ts` validates the environment at import time, so the defaults
 * below must exist before any test module is loaded.
 */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://quizway:quizway@localhost:5432/quizway";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-value-1234567890";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? "30d";
// Keeps bcrypt fast in unit tests without changing production behaviour.
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? "4";
