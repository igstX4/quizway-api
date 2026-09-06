import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  type AttemptResultResponse,
  type QuizStatsResponse,
  type StartAttemptResponse,
} from "@quizway/contracts";
import { PrismaService } from "@quizway/prisma";
import type {
  GetAttemptResultDto,
  GetQuizStatsDto,
  StartAttemptDto,
  SubmitAttemptDto,
} from "../quizzes/dto/quizzes.dto";
import {
  ATTEMPT_PUBLISHER,
  type AttemptPublisher,
} from "./attempt-publisher";
import { gradeAttempt, requireGradableQuestionType, type GradableQuestion } from "./grading";

const RESULT_INCLUDE = {
  quiz: { select: { id: true, ownerId: true, passingScore: true } },
  answers: { orderBy: { questionId: "asc" } },
} as const;

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ATTEMPT_PUBLISHER)
    private readonly attemptPublisher: AttemptPublisher,
  ) {}

  /** Creates an attempt for a published quiz and freezes its maximum score. */
  async start(dto: StartAttemptDto): Promise<StartAttemptResponse> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: dto.quizId, status: "PUBLISHED" },
      include: { questions: { select: { points: true } } },
    });

    if (!quiz) {
      throw new NotFoundException("Quiz is not available");
    }

    if (quiz.questions.length === 0) {
      throw new BadRequestException("This quiz has no questions yet");
    }

    const maxScore = quiz.questions.reduce((sum, question) => sum + question.points, 0);

    const attempt = await this.prisma.attempt.create({
      data: {
        quizId: quiz.id,
        participantId: dto.participantId ?? null,
        participantName: dto.participantName?.trim() || null,
        maxScore,
      },
    });

    return {
      attemptId: attempt.id,
      maxScore,
      startedAt: attempt.startedAt.toISOString(),
    };
  }

  /**
   * Grades and stores a submission, then enqueues a background job.
   *
   * Idempotent: a retried submission for an already graded attempt returns the
   * stored result instead of double counting.
   */
  async submit(dto: SubmitAttemptDto): Promise<AttemptResultResponse> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: dto.attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            ownerId: true,
            passingScore: true,
            questions: { include: { options: { orderBy: { position: "asc" } } } },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException("Attempt not found");
    }

    if (attempt.status !== "IN_PROGRESS") {
      return this.result({ attemptId: attempt.id });
    }

    const questions: GradableQuestion[] = attempt.quiz.questions.map((question) => {
      const correctOptions = question.options.filter((option) => option.isCorrect);

      return {
        id: question.id,
        type: requireGradableQuestionType(question.type),
        points: question.points,
        correctOptionIds: correctOptions.map((option) => option.id),
        acceptedAnswers: correctOptions.map((option) => option.label),
      };
    });

    const graded = gradeAttempt(
      questions,
      dto.answers.map((answer) => ({
        questionId: answer.questionId,
        selectedOptionIds: answer.selectedOptionIds ?? [],
        textAnswer: answer.textAnswer,
      })),
      attempt.quiz.passingScore,
    );

    const submittedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Replace, never append: a retried submit must not duplicate answers.
      await tx.answer.deleteMany({ where: { attemptId: attempt.id } });

      if (graded.answers.length > 0) {
        await tx.answer.createMany({
          data: graded.answers.map((answer) => {
            const submitted = dto.answers.find(
              (candidate) => candidate.questionId === answer.questionId,
            );

            return {
              attemptId: attempt.id,
              questionId: answer.questionId,
              // SQLite stores the id list as JSON, exactly like the web app does.
              selectedOptionIds: JSON.stringify(submitted?.selectedOptionIds ?? []),
              textAnswer: submitted?.textAnswer ?? null,
              isCorrect: answer.isCorrect,
              awardedPoints: answer.awardedPoints,
            };
          }),
        });
      }

      await tx.attempt.update({
        where: { id: attempt.id },
        data: {
          status: "SUBMITTED",
          score: graded.score,
          maxScore: graded.maxScore,
          submittedAt,
        },
      });
    });

    // Publishing is fire-and-forget: background work (audit trail, future
    // notifications) must never block the participant's response.
    await this.attemptPublisher.publish({
      attemptId: attempt.id,
      quizId: attempt.quiz.id,
      ownerId: attempt.quiz.ownerId,
      score: graded.score,
      maxScore: graded.maxScore,
      passed: graded.passed,
    });

    return this.result({ attemptId: attempt.id });
  }

  /** Stored result of a finished attempt. */
  async result(dto: GetAttemptResultDto): Promise<AttemptResultResponse> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: dto.attemptId },
      include: RESULT_INCLUDE,
    });

    if (!attempt || attempt.status !== "SUBMITTED") {
      throw new NotFoundException("Attempt result not found");
    }

    const percentage = attempt.maxScore === 0 ? 0 : attempt.score / attempt.maxScore;

    return {
      attemptId: attempt.id,
      quizId: attempt.quiz.id,
      participantName: attempt.participantName ?? "",
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage,
      passed: percentage * 100 >= attempt.quiz.passingScore,
      answers: attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        isCorrect: answer.isCorrect,
        awardedPoints: answer.awardedPoints,
      })),
      submittedAt: (attempt.submittedAt ?? attempt.startedAt).toISOString(),
    };
  }

  /** Analytics for the quiz owner, aggregated in SQL. */
  async stats(dto: GetQuizStatsDto): Promise<QuizStatsResponse> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: dto.quizId, ownerId: dto.ownerId },
      select: { passingScore: true },
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    const submitted = { quizId: dto.quizId, status: "SUBMITTED" } as const;

    const [attempts, questions, answeredRows, correctRows] = await Promise.all([
      this.prisma.attempt.findMany({
        where: submitted,
        select: { score: true, maxScore: true },
      }),
      this.prisma.question.findMany({
        where: { quizId: dto.quizId },
        orderBy: { position: "asc" },
        select: { id: true, prompt: true },
      }),
      this.prisma.answer.groupBy({
        by: ["questionId"],
        where: { attempt: submitted },
        _count: { _all: true },
      }),
      this.prisma.answer.groupBy({
        by: ["questionId"],
        where: { attempt: submitted, isCorrect: true },
        _count: { _all: true },
      }),
    ]);

    const answeredByQuestion = new Map(
      answeredRows.map((row) => [row.questionId, row._count._all]),
    );
    const correctByQuestion = new Map(
      correctRows.map((row) => [row.questionId, row._count._all]),
    );

    const totalScore = attempts.reduce((sum, row) => sum + row.score, 0);
    const totalMax = attempts.reduce((sum, row) => sum + row.maxScore, 0);
    const passed = attempts.filter(
      (row) => row.maxScore > 0 && (row.score / row.maxScore) * 100 >= quiz.passingScore,
    ).length;

    return {
      totalAttempts: attempts.length,
      averagePercentage: totalMax === 0 ? 0 : totalScore / totalMax,
      passRate: attempts.length === 0 ? 0 : passed / attempts.length,
      questions: questions.map((question) => {
        const answered = answeredByQuestion.get(question.id) ?? 0;
        const correct = correctByQuestion.get(question.id) ?? 0;

        return {
          questionId: question.id,
          prompt: question.prompt,
          answered,
          correctRate: answered === 0 ? 0 : correct / answered,
        };
      }),
    };
  }
}


