import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export const QUIZ_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type QuizStatusBody = (typeof QUIZ_STATUSES)[number];

export class CreateQuizBody {
  @ApiProperty({ example: "Onboarding knowledge check" })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}

export class UpdateQuizStatusBody {
  @ApiProperty({ enum: QUIZ_STATUSES })
  @IsIn(QUIZ_STATUSES)
  status!: QuizStatusBody;
}

export class StartAttemptBody {
  @ApiPropertyOptional({
    description: "Required for anonymous participants; ignored for signed-in users.",
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  participantName?: string;
}

export class SubmittedAnswerBody {
  @ApiProperty()
  @IsUUID("4")
  questionId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  selectedOptionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  textAnswer?: string;
}

export class SubmitAttemptBody {
  @ApiProperty({ type: [SubmittedAnswerBody] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerBody)
  answers!: SubmittedAnswerBody[];
}
