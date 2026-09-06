/** Question kinds supported by the grader. Mirrors `Question.type` in Prisma. */
export const GRADABLE_QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_TEXT",
] as const;

export type GradableQuestionType = (typeof GRADABLE_QUESTION_TYPES)[number];

/**
 * Narrows a `Question.type` string coming from SQLite into the grader's union.
 *
 * Anything else is a data-integrity bug rather than a user error, so it is
 * rejected loudly instead of being silently graded as "wrong answer".
 */
export function requireGradableQuestionType(value: string): GradableQuestionType {
  if ((GRADABLE_QUESTION_TYPES as readonly string[]).includes(value)) {
    return value as GradableQuestionType;
  }

  throw new Error(`Unsupported question type in the database: "${value}"`);
}


export interface GradableQuestion {
  id: string;
  type: GradableQuestionType;
  points: number;
  correctOptionIds: string[];
  acceptedAnswers: string[];
}

export interface SubmittedAnswer {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer?: string;
}

export interface GradedAnswer {
  questionId: string;
  isCorrect: boolean;
  awardedPoints: number;
}

export interface AttemptGrade {
  answers: GradedAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
}

/** Normalises free-text answers: case, surrounding and repeated whitespace. */
export function normalizeTextAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const expected = new Set(b);
  return a.every((item) => expected.has(item));
}

function isCorrect(question: GradableQuestion, answer: SubmittedAnswer): boolean {
  switch (question.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
      return (
        answer.selectedOptionIds.length === 1 &&
        question.correctOptionIds.includes(answer.selectedOptionIds[0] ?? "")
      );

    case "MULTIPLE_CHOICE":
      // All-or-nothing: partial credit is intentionally not awarded.
      return sameSet(answer.selectedOptionIds, question.correctOptionIds);

    case "SHORT_TEXT": {
      const submitted = answer.textAnswer ? normalizeTextAnswer(answer.textAnswer) : "";
      if (!submitted) return false;

      return question.acceptedAnswers.some(
        (accepted) => normalizeTextAnswer(accepted) === submitted,
      );
    }
  }
}

/**
 * Grades an attempt.
 *
 * Pure and synchronous so the Server Action path, the worker and the unit tests
 * all share exactly one implementation of the scoring rules.
 */
export function gradeAttempt(
  questions: readonly GradableQuestion[],
  answers: readonly SubmittedAnswer[],
  passingScorePercent: number,
): AttemptGrade {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

  let score = 0;
  let maxScore = 0;
  const graded: GradedAnswer[] = [];

  for (const question of questions) {
    maxScore += question.points;

    const answer = byQuestion.get(question.id);
    const correct = answer ? isCorrect(question, answer) : false;
    const awardedPoints = correct ? question.points : 0;

    score += awardedPoints;
    graded.push({ questionId: question.id, isCorrect: correct, awardedPoints });
  }

  const percentage = maxScore === 0 ? 0 : score / maxScore;

  return {
    answers: graded,
    score,
    maxScore,
    percentage,
    passed: percentage * 100 >= passingScorePercent,
  };
}
