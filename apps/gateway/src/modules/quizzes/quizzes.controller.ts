import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  AttemptResultResponse,
  DeleteQuizResponse,
  ListQuizzesResponse,
  QuizResponse,
  QuizStatsResponse,
  StartAttemptResponse,
  UserProfile,
} from "@quizway/contracts";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { Public } from "../../common/auth/public.decorator";
import { QuizGrpcService } from "../../grpc/grpc-services";
import {
  CreateQuizBody,
  StartAttemptBody,
  SubmitAttemptBody,
  UpdateQuizStatusBody,
} from "./dto/quizzes.dto";

/**
 * HTTP edge of the quiz domain.
 *
 * Author routes are authenticated by the global `JwtAuthGuard`; participant
 * routes are marked `@Public` and only ever reach the service without the
 * answer key.
 *
 * Route order matters: `/public/...` and `/attempts/...` are declared before
 * `/:quizId`, otherwise Express would match `:quizId = "public"` first.
 */
@ApiTags("quizzes")
@ApiBearerAuth()
@Controller("quizzes")
export class QuizzesController {
  constructor(private readonly quiz: QuizGrpcService) {}

  /* --------------------------- participant routes ------------------------- */

  @Public()
  @Get("public/:quizId")
  @ApiOperation({ summary: "Public quiz payload — never contains the answer key" })
  getPublicQuiz(@Param("quizId", ParseUUIDPipe) quizId: string): Promise<QuizResponse> {
    return this.quiz.service.getQuiz({ quizId, includeAnswerKey: false });
  }

  @Public()
  @Post("public/:quizId/attempts")
  @ApiOperation({ summary: "Start an attempt (anonymous participants allowed)" })
  startAttempt(
    @Param("quizId", ParseUUIDPipe) quizId: string,
    @Body() body: StartAttemptBody,
  ): Promise<StartAttemptResponse> {
    return this.quiz.service.startAttempt({
      quizId,
      participantName: body.participantName,
    });
  }

  @Public()
  @Post("attempts/:attemptId/submit")
  @ApiOperation({ summary: "Submit answers; the quiz service grades them" })
  submitAttempt(
    @Param("attemptId", ParseUUIDPipe) attemptId: string,
    @Body() body: SubmitAttemptBody,
  ): Promise<AttemptResultResponse> {
    return this.quiz.service.submitAttempt({
      attemptId,
      // Normalise optional HTTP fields into the exact gRPC message shape.
      answers: body.answers.map((answer) => ({
        questionId: answer.questionId,
        selectedOptionIds: answer.selectedOptionIds ?? [],
        textAnswer: answer.textAnswer ?? "",
      })),
    });
  }

  @Public()
  @Get("attempts/:attemptId")
  @ApiOperation({ summary: "Result of a finished attempt" })
  attemptResult(
    @Param("attemptId", ParseUUIDPipe) attemptId: string,
  ): Promise<AttemptResultResponse> {
    return this.quiz.service.getAttemptResult({ attemptId });
  }

  /* ----------------------------- author routes ---------------------------- */

  @Post()
  @ApiOperation({ summary: "Create an empty quiz" })
  create(
    @CurrentUser() user: UserProfile,
    @Body() body: CreateQuizBody,
  ): Promise<QuizResponse> {
    return this.quiz.service.createQuiz({
      ownerId: user.id,
      title: body.title,
      description: body.description,
      category: body.category,
    });
  }

  @Get()
  @ApiOperation({ summary: "List the caller's quizzes with counters" })
  list(@CurrentUser() user: UserProfile): Promise<ListQuizzesResponse> {
    return this.quiz.service.listQuizzes({ ownerId: user.id });
  }

  @Get(":quizId")
  @ApiOperation({ summary: "Load a quiz including its answer key" })
  get(
    @CurrentUser() user: UserProfile,
    @Param("quizId", ParseUUIDPipe) quizId: string,
  ): Promise<QuizResponse> {
    return this.quiz.service.getQuiz({
      quizId,
      ownerId: user.id,
      includeAnswerKey: true,
    });
  }

  @Patch(":quizId/status")
  @ApiOperation({ summary: "Publish or unpublish a quiz" })
  updateStatus(
    @CurrentUser() user: UserProfile,
    @Param("quizId", ParseUUIDPipe) quizId: string,
    @Body() body: UpdateQuizStatusBody,
  ): Promise<QuizResponse> {
    return this.quiz.service.updateQuizStatus({
      quizId,
      ownerId: user.id,
      status: body.status,
    });
  }

  @Get(":quizId/stats")
  @ApiOperation({ summary: "Aggregated analytics for the owner" })
  stats(
    @CurrentUser() user: UserProfile,
    @Param("quizId", ParseUUIDPipe) quizId: string,
  ): Promise<QuizStatsResponse> {
    return this.quiz.service.getQuizStats({ quizId, ownerId: user.id });
  }

  @Delete(":quizId")
  @ApiOperation({ summary: "Delete a quiz and everything that hangs off it" })
  remove(
    @CurrentUser() user: UserProfile,
    @Param("quizId", ParseUUIDPipe) quizId: string,
  ): Promise<DeleteQuizResponse> {
    return this.quiz.service.deleteQuiz({ quizId, ownerId: user.id });
  }
}
