import { gradeAttempt, normalizeTextAnswer, type GradableQuestion } from "./grading";

const singleChoice: GradableQuestion = {
  id: "q1",
  type: "SINGLE_CHOICE",
  points: 2,
  correctOptionIds: ["a"],
  acceptedAnswers: [],
};

const multipleChoice: GradableQuestion = {
  id: "q2",
  type: "MULTIPLE_CHOICE",
  points: 3,
  correctOptionIds: ["b", "c"],
  acceptedAnswers: [],
};

const shortText: GradableQuestion = {
  id: "q3",
  type: "SHORT_TEXT",
  points: 1,
  correctOptionIds: [],
  acceptedAnswers: ["Hypertext Markup Language"],
};

describe("normalizeTextAnswer", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeTextAnswer("  Hello   World ")).toBe("hello world");
  });
});

describe("gradeAttempt", () => {
  it("awards full points for a fully correct submission", () => {
    const result = gradeAttempt(
      [singleChoice, multipleChoice, shortText],
      [
        { questionId: "q1", selectedOptionIds: ["a"] },
        { questionId: "q2", selectedOptionIds: ["c", "b"] },
        { questionId: "q3", selectedOptionIds: [], textAnswer: "hYPERTEXT markup language" },
      ],
      60,
    );

    expect(result.score).toBe(6);
    expect(result.maxScore).toBe(6);
    expect(result.percentage).toBe(1);
    expect(result.passed).toBe(true);
  });

  it("treats partial multi-select answers as incorrect", () => {
    const result = gradeAttempt(
      [multipleChoice],
      [{ questionId: "q2", selectedOptionIds: ["b"] }],
      50,
    );

    expect(result.score).toBe(0);
    expect(result.answers[0]?.isCorrect).toBe(false);
  });

  it("counts unanswered questions as incorrect without throwing", () => {
    const result = gradeAttempt([singleChoice, multipleChoice], [], 50);

    expect(result.answers).toHaveLength(2);
    expect(result.maxScore).toBe(5);
    expect(result.score).toBe(0);
  });

  it("passes exactly on the threshold", () => {
    const result = gradeAttempt(
      [singleChoice, multipleChoice],
      [
        { questionId: "q1", selectedOptionIds: ["a"] },
        { questionId: "q2", selectedOptionIds: ["b", "c"] },
      ],
      100,
    );

    expect(result.percentage).toBe(1);
    expect(result.passed).toBe(true);
  });
});
