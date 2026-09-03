import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import {
  QUIZ_SERVICE_NAME,
  type DeleteQuizResponse,
  type ListQuizzesResponse,
  type QuizResponse,
} from "@quizway/contracts";
import { QuizzesService } from "./quizzes.service";
// Value imports: Nest needs the runtime class for ValidationPipe metadata.
import {
  CreateQuizDto,
  DeleteQuizDto,
  GetQuizDto,
  ListQuizzesDto,
  UpdateQuizStatusDto,
} from "./dto/quizzes.dto";

@Controller()
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @GrpcMethod(QUIZ_SERVICE_NAME, "CreateQuiz")
  createQuiz(dto: CreateQuizDto): Promise<QuizResponse> {
    return this.quizzes.create(dto);
  }

  @GrpcMethod(QUIZ_SERVICE_NAME, "ListQuizzes")
  async listQuizzes(dto: ListQuizzesDto): Promise<ListQuizzesResponse> {
    return { quizzes: await this.quizzes.list(dto.ownerId) };
  }

  @GrpcMethod(QUIZ_SERVICE_NAME, "GetQuiz")
  getQuiz(dto: GetQuizDto): Promise<QuizResponse> {
    return this.quizzes.findOne(dto);
  }

  @GrpcMethod(QUIZ_SERVICE_NAME, "UpdateQuizStatus")
  updateQuizStatus(dto: UpdateQuizStatusDto): Promise<QuizResponse> {
    return this.quizzes.updateStatus(dto);
  }

  @GrpcMethod(QUIZ_SERVICE_NAME, "DeleteQuiz")
  async deleteQuiz(dto: DeleteQuizDto): Promise<DeleteQuizResponse> {
    return { deleted: await this.quizzes.remove(dto.quizId, dto.ownerId) };
  }
}
