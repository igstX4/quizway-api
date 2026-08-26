import { hash } from "bcrypt";
import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@quizway.dev";
const DEMO_PASSWORD = "Password123!";

/**
 * Idempotent seed: creates one demo owner with a small, realistic quiz.
 *
 * Status and question types are plain strings because SQLite has no native
 * enums (see `schema.prisma`).
 *
 * Run with `npm run prisma:seed` after `npm run prisma:push`.
 */
async function main(): Promise<void> {
  const passwordHash = await hash(DEMO_PASSWORD, 10);

  const owner = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { fullName: "Demo Owner" },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      fullName: "Demo Owner",
    },
  });

  await prisma.quiz.deleteMany({ where: { ownerId: owner.id } });

  const quiz = await prisma.quiz.create({
    data: {
      ownerId: owner.id,
      title: "API fundamentals",
      description: "A short check of HTTP and REST basics.",
      category: "Engineering",
      status: "PUBLISHED",
      passingScore: 60,
      timeLimitSec: 600,
      questions: {
        create: [
          {
            type: "SINGLE_CHOICE",
            prompt: "Which HTTP status code means “Not Found”?",
            explanation: "404 signals that the resource does not exist.",
            points: 2,
            position: 0,
            options: {
              create: [
                { label: "200", isCorrect: false, position: 0 },
                { label: "404", isCorrect: true, position: 1 },
                { label: "500", isCorrect: false, position: 2 },
              ],
            },
          },
          {
            type: "MULTIPLE_CHOICE",
            prompt: "Which methods are considered idempotent?",
            explanation: "GET and PUT are idempotent; POST is not.",
            points: 3,
            position: 1,
            options: {
              create: [
                { label: "GET", isCorrect: true, position: 0 },
                { label: "PUT", isCorrect: true, position: 1 },
                { label: "POST", isCorrect: false, position: 2 },
              ],
            },
          },
          {
            type: "SHORT_TEXT",
            prompt: "Which HTTP header carries the bearer token?",
            explanation: "Authorization: Bearer <token>.",
            points: 1,
            position: 2,
            options: {
              create: [
                { label: "authorization", isCorrect: true, position: 0 },
                { label: "authorization header", isCorrect: true, position: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Seeded quiz "${quiz.title}" (${quiz.id})`);
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
