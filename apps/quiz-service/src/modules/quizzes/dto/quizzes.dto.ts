import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { EmptyToUndefined } from "../../../common/empty-to-undefined.transform";

export const QUIZ_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type QuizStatusValue = (typeof QUIZ_STATUSES)[number];

export class CreateQuizDto {
  @IsUUID("4", { message: "ownerId must be a UUID" })
  ownerId!: string;

  @IsString()
  @MinLength(3, { message: "title must be at least 3 characters long" })
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MaxLength(60)
  category?: string;
}

export class ListQuizzesDto {
  @IsUUID("4", { message: "ownerId must be a UUID" })
  ownerId!: string;
}

export class GetQuizDto {
  @IsUUID("4", { message: "quizId must be a UUID" })
  quizId!: string;

  /** When present the request fails if the quiz belongs to somebody else. */
  @IsOptional()
  @EmptyToUndefined()
  @IsUUID("4")
  ownerId?: string;

  /** Author views request the answer key; participant views never do. */
  @IsOptional()
  @IsBoolean()
  includeAnswerKey?: boolean;
}

export class UpdateQuizStatusDto {
  @IsUUID("4")
  quizId!: string;

  @IsUUID("4")
  ownerId!: string;

  @IsIn(QUIZ_STATUSES, { message: "status must be DRAFT or PUBLISHED" })
  status!: QuizStatusValue;
}

export class DeleteQuizDto {
  @IsUUID("4")
  quizId!: string;

  @IsUUID("4")
  ownerId!: string;
}

/* ----------------------------- attempts ---------------------------------- */

export class StartAttemptDto {
  @IsUUID("4", { message: "quizId must be a UUID" })
  quizId!: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID("4")
  participantId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MaxLength(80)
  participantName?: string;
}

export class SubmittedAnswerDto {
  @IsUUID("4", { message: "questionId must be a UUID" })
  questionId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  selectedOptionIds?: string[];

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MaxLength(300)
  textAnswer?: string;
}

export class SubmitAttemptDto {
  @IsUUID("4", { message: "attemptId must be a UUID" })
  attemptId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers!: SubmittedAnswerDto[];
}

export class GetAttemptResultDto {
  @IsUUID("4", { message: "attemptId must be a UUID" })
  attemptId!: string;
}

export class GetQuizStatsDto {
  @IsUUID("4")
  quizId!: string;

  @IsUUID("4")
  ownerId!: string;
}
