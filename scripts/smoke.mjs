#!/usr/bin/env node
/**
 * End-to-end smoke test against a running QuizWay API.
 *
 * Exercises the whole chain the gateway sits in front of:
 * health → login → list quizzes → load quiz → start attempt → grade → stats,
 * plus three negative checks (answer key never leaks, wrong password rejected,
 * author routes require a token).
 *
 * Usage:
 *   npm run smoke                      # expects the gateway on :4000
 *   SMOKE_BASE_URL=... npm run smoke   # override the target
 *
 * Requires the demo data from `npm run prisma:seed`.
 */

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:4000/api";
const EMAIL = process.env.SMOKE_EMAIL ?? "demo@quizway.dev";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Password123!";
const TIMEOUT_MS = 20_000;

async function call(method, path, { token, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(`${method} ${path} → ${response.status} ${text}`);
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

function check(label, passed, detail = "") {
  console.log(`[${passed ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!passed) process.exitCode = 1;
}

/** Builds a fully correct submission from a quiz payload that has the key. */
function answersFor(quiz) {
  return quiz.questions.map((question) => {
    const correct = question.options.filter((option) => option.isCorrect);

    if (question.type === "SHORT_TEXT") {
      return {
        questionId: question.id,
        selectedOptionIds: [],
        textAnswer: correct[0]?.label ?? "",
      };
    }

    if (question.type === "MULTIPLE_CHOICE") {
      return { questionId: question.id, selectedOptionIds: correct.map((o) => o.id) };
    }

    return {
      questionId: question.id,
      selectedOptionIds: correct[0] ? [correct[0].id] : [],
    };
  });
}

async function main() {
  console.log(`Smoke testing ${BASE_URL}\n`);

  const health = await call("GET", "/health");
  check("gateway health", health.status === "ok", health.service);

  const auth = await call("POST", "/auth/login", {
    body: { email: EMAIL, password: PASSWORD },
  });
  check("login returns a token pair", Boolean(auth.accessToken), auth.user.email);
  check("refresh token issued", Boolean(auth.refreshToken));

  const token = auth.accessToken;

  const list = await call("GET", "/quizzes", { token });
  check("list quizzes", list.quizzes.length > 0, `${list.quizzes.length} quiz(zes)`);

  const quizId = list.quizzes[0].id;

  const { quiz } = await call("GET", `/quizzes/${quizId}`, { token });
  check(
    "load quiz with answer key",
    quiz.questions.length > 0,
    `${quiz.questions.length} questions`,
  );

  const attempt = await call("POST", `/quizzes/public/${quizId}/attempts`, {
    body: { participantName: "smoke test" },
  });
  check("start attempt", Boolean(attempt.attemptId), `maxScore=${attempt.maxScore}`);

  const result = await call("POST", `/quizzes/attempts/${attempt.attemptId}/submit`, {
    body: { answers: answersFor(quiz) },
  });
  check(
    "grade a fully correct submission",
    result.score === result.maxScore && result.maxScore > 0,
    `${result.score}/${result.maxScore} (${Math.round(result.percentage * 100)}%)`,
  );
  check("passed flag follows the threshold", result.passed === true);

  const publicQuiz = await call("GET", `/quizzes/public/${quizId}`);
  const leaksAnswerKey = publicQuiz.quiz.questions.some((question) =>
    question.options.some((option) => option.isCorrect),
  );
  check("public payload hides the answer key", leaksAnswerKey === false);

  const stats = await call("GET", `/quizzes/${quizId}/stats`, { token });
  check(
    "analytics aggregate the attempt",
    stats.totalAttempts > 0,
    `attempts=${stats.totalAttempts} avg=${Math.round(stats.averagePercentage * 100)}% passRate=${Math.round(stats.passRate * 100)}%`,
  );

  const rejected = await call("POST", "/auth/login", {
    body: { email: EMAIL, password: "definitely-the-wrong-password" },
  }).then(
    () => null,
    (error) => error.message,
  );
  check("wrong password is rejected", typeof rejected === "string" && rejected.includes("401"));

  const guarded = await call("GET", "/quizzes").then(
    () => null,
    (error) => error.message,
  );
  check("author routes require a token", typeof guarded === "string" && guarded.includes("401"));

  console.log(process.exitCode ? "\nSmoke test FAILED" : "\nSmoke test passed ✅");
}

await main();
