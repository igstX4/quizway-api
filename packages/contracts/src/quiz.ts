/**
 * TypeScript view of `quiz.proto` — the core domain contract.
 */

export interface OptionDto {
  id: string;
  label: string;
  /** Always `false` when `includeAnswerKey` is unset. */
  isCorrect: boolean;
  position: number;
}

export interface QuestionDto {
  id: string;
  type: string;
  prompt: string;
  explanation: string;
  points: number;
  position: number;
  options: OptionDto[];
}

export interface QuizDto {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  timeLimitSec: number;
  passingScore: number;
  shuffleQuestions: boolean;
  questions: QuestionDto[];
}

export interface QuizSummaryDto {
  id: string;
  title: string;
  category: string;
  status: string;
  questionCount: number;
  attemptCount: number;
  updatedAt: string;
}

export interface CreateQuizRequest {
  ownerId: string;
  title: string;
  description?: string;
  category?: string;
}

export interface ListQuizzesRequest {
  ownerId: string;
}

export interface ListQuizzesResponse {
  quizzes: QuizSummaryDto[];
}

export interface GetQuizRequest {
  quizId: string;
  ownerId?: string;
  includeAnswerKey?: boolean;
}

export interface QuizResponse {
  quiz: QuizDto;
}

export interface UpdateQuizStatusRequest {
  quizId: string;
  ownerId: string;
  status: string;
}

export interface DeleteQuizRequest {
  quizId: string;
  ownerId: string;
}

export interface DeleteQuizResponse {
  deleted: boolean;
}

export interface StartAttemptRequest {
  quizId: string;
  participantId?: string;
  participantName?: string;
}

export interface StartAttemptResponse {
  attemptId: string;
  maxScore: number;
  startedAt: string;
}

export interface SubmittedAnswer {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer?: string;
}

export interface SubmitAttemptRequest {
  attemptId: string;
  answers: SubmittedAnswer[];
}

export interface GradedAnswerDto {
  questionId: string;
  isCorrect: boolean;
  awardedPoints: number;
}

export interface AttemptResultResponse {
  attemptId: string;
  quizId: string;
  participantName: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  answers: GradedAnswerDto[];
  submittedAt: string;
}

export interface GetAttemptResultRequest {
  attemptId: string;
}

export interface GetQuizStatsRequest {
  quizId: string;
  ownerId: string;
}

export interface QuestionStatsDto {
  questionId: string;
  prompt: string;
  answered: number;
  correctRate: number;
}

export interface QuizStatsResponse {
  totalAttempts: number;
  averagePercentage: number;
  passRate: number;
  questions: QuestionStatsDto[];
}

/** Promise-based gRPC client surface exposed by `QuizService`. */
export interface QuizServiceClient {
  createQuiz(request: CreateQuizRequest): Promise<QuizResponse>;
  listQuizzes(request: ListQuizzesRequest): Promise<ListQuizzesResponse>;
  getQuiz(request: GetQuizRequest): Promise<QuizResponse>;
  updateQuizStatus(request: UpdateQuizStatusRequest): Promise<QuizResponse>;
  deleteQuiz(request: DeleteQuizRequest): Promise<DeleteQuizResponse>;
  startAttempt(request: StartAttemptRequest): Promise<StartAttemptResponse>;
  submitAttempt(request: SubmitAttemptRequest): Promise<AttemptResultResponse>;
  getAttemptResult(request: GetAttemptResultRequest): Promise<AttemptResultResponse>;
  getQuizStats(request: GetQuizStatsRequest): Promise<QuizStatsResponse>;
}

export const QUIZ_SERVICE_NAME = "QuizService";

/** Queue + job names shared by the publisher (quiz-service) and the worker. */
export const ATTEMPT_QUEUE = "attempts";
export const ATTEMPT_GRADED_JOB = "attempt.graded";

export interface AttemptGradedJob {
  attemptId: string;
  quizId: string;
  ownerId: string;
  score: number;
  maxScore: number;
  passed: boolean;
}
