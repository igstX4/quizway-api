import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { QuizResponse, QuizSummaryDto } from "@quizway/contracts";
import { PrismaService, type Prisma } from "@quizway/prisma";
import type {
  CreateQuizDto,
  GetQuizDto,
  UpdateQuizStatusDto,
} from "./dto/quizzes.dto";
import { toQuizDto, toQuizSummaryDto } from "./quiz.mapper";

const QUIZ_INCLUDE = {
  questions: {
    orderBy: { position: "asc" },
    include: { options: { orderBy: { position: "asc" } } },
  },
} satisfies Prisma.QuizInclude;

type QuizWithQuestions = Prisma.QuizGetPayload<{ include: typeof QUIZ_INCLUDE }>;

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuizDto): Promise<QuizResponse> {
    const owner = await this.prisma.user.findUnique({ where: { id: dto.ownerId } });
    if (!owner) {
      throw new NotFoundException("Owner account not found");
    }

    const quiz = await this.prisma.quiz.create({
      data: {
        ownerId: dto.ownerId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        category: dto.category?.trim() || null,
      },
      include: QUIZ_INCLUDE,
    });

    return { quiz: toQuizDto(quiz, true) };
  }

  async list(ownerId: string): Promise<QuizSummaryDto[]> {
    const quizzes = await this.prisma.quiz.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    });

    return quizzes.map(toQuizSummaryDto);
  }

  /**
   * Loads one quiz.
   *
   * `includeAnswerKey` is opt-in so the participant-facing gateway route can
   * share the same endpoint without ever receiving `isCorrect` flags.
   */
  async findOne(dto: GetQuizDto): Promise<QuizResponse> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: dto.quizId },
      include: QUIZ_INCLUDE,
    });

    if (!quiz || (dto.ownerId && quiz.ownerId !== dto.ownerId)) {
      throw new NotFoundException("Quiz not found");
    }

    return { quiz: toQuizDto(quiz, dto.includeAnswerKey === true) };
  }

  async updateStatus(dto: UpdateQuizStatusDto): Promise<QuizResponse> {
    const quiz = await this.requireOwnedQuiz(dto.quizId, dto.ownerId);

    if (dto.status === "PUBLISHED") {
      const questionCount = await this.prisma.question.count({
        where: { quizId: quiz.id },
      });

      if (questionCount === 0) {
        throw new BadRequestException("A quiz needs at least one question before publishing");
      }
    }

    const updated = await this.prisma.quiz.update({
      where: { id: quiz.id },
      data: { status: dto.status },
      include: QUIZ_INCLUDE,
    });

    return { quiz: toQuizDto(updated, true) };
  }

  async remove(quizId: string, ownerId: string): Promise<boolean> {
    await this.requireOwnedQuiz(quizId, ownerId);
    await this.prisma.quiz.delete({ where: { id: quizId } });
    return true;
  }

  /** Ownership guard shared by every mutating operation. */
  async requireOwnedQuiz(quizId: string, ownerId: string): Promise<QuizWithQuestions> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, ownerId },
      include: QUIZ_INCLUDE,
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    return quiz;
  }
}
