import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import {
  QUIZ_SERVICE_NAME,
  type AttemptResultResponse,
  type QuizStatsResponse,
  type StartAttemptResponse,
} from "@quizway/contracts";
import { AttemptsService } from "./attempts.service";
// Value imports: Nest needs the runtime class for ValidationPipe metadata.
import {
  GetAttemptResultDto,
  GetQuizStatsDto,
  StartAttemptDto,
  SubmitAttemptDto,
} from "../quizzes/dto/quizzes.dto";

@Controller()
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @GrpcMethod(QUIZ_SERVICE_NAME, "StartAttempt")
  startAttempt(dto: StartAttemptDto): Promise<StartAttemptResponse> {
    return this.attempts.start(dto);
  }

  @GrpcMethod(QUIZ_SERVICE_NAME, "SubmitAttempt")
  submitAttempt(dto: SubmitAttemptDto): Promise<AttemptResultResponse> {
    return this.attempts.submit(dto);
  }

  @GrpcMethod(QUIZ_SERVICE_NAME, "GetAttemptResult")
  getAttemptResult(dto: GetAttemptResultDto): Promise<AttemptResultResponse> {
    return this.attempts.result(dto);
  }

  @GrpcMethod(QUIZ_SERVICE_NAME, "GetQuizStats")
  getQuizStats(dto: GetQuizStatsDto): Promise<QuizStatsResponse> {
    return this.attempts.stats(dto);
  }
}
