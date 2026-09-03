import type { QuizDto, QuizSummaryDto } from "@quizway/contracts";
import type { Prisma } from "@quizway/prisma";

type QuizWithQuestionsAndOptions = Prisma.QuizGetPayload<{
  include: {
    questions: { include: { options: true } };
  };
}>;

type QuizWithCounts = Prisma.QuizGetPayload<{
  include: { _count: { select: { questions: true; attempts: true } } };
}>;

/**
 * Maps Prisma rows to gRPC messages.
 *
 * `includeAnswerKey` is the single switch that decides whether `isCorrect`
 * leaves the service; everything else in the payload is always safe to send.
 */
export function toQuizDto(
  quiz: QuizWithQuestionsAndOptions,
  includeAnswerKey: boolean,
): QuizDto {
  return {
    id: quiz.id,
    ownerId: quiz.ownerId,
    title: quiz.title,
    description: quiz.description ?? "",
    category: quiz.category ?? "",
    status: quiz.status,
    timeLimitSec: quiz.timeLimitSec ?? 0,
    passingScore: quiz.passingScore,
    shuffleQuestions: quiz.shuffleQuestions,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      explanation: question.explanation ?? "",
      points: question.points,
      position: question.position,
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label,
        isCorrect: includeAnswerKey ? option.isCorrect : false,
        position: option.position,
      })),
    })),
  };
}

export function toQuizSummaryDto(quiz: QuizWithCounts): QuizSummaryDto {
  return {
    id: quiz.id,
    title: quiz.title,
    category: quiz.category ?? "",
    status: quiz.status,
    questionCount: quiz._count.questions,
    attemptCount: quiz._count.attempts,
    updatedAt: quiz.updatedAt.toISOString(),
  };
}
