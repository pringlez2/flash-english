export type ReviewResult = "CORRECT" | "HOLD" | "WRONG";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function toReviewResult(value: string): ReviewResult | null {
  if (value === "correct") return "CORRECT";
  if (value === "hold") return "HOLD";
  if (value === "wrong") return "WRONG";
  return null;
}

export function fromReviewResult(value: ReviewResult | null): "correct" | "hold" | "wrong" | null {
  if (value === "CORRECT") return "correct";
  if (value === "HOLD") return "hold";
  if (value === "WRONG") return "wrong";
  return null;
}

export function calcReviewState(currentStreak: number, result: ReviewResult, now = new Date()) {
  if (result === "WRONG") {
    return {
      streak: 0,
      nextDueAt: new Date(now.getTime() + 10 * MINUTE_MS),
    };
  }

  if (result === "HOLD") {
    return {
      streak: 0,
      nextDueAt: new Date(now.getTime() + 12 * HOUR_MS),
    };
  }

  const streak = currentStreak + 1;

  let intervalMs = 30 * DAY_MS;
  if (streak === 1) intervalMs = DAY_MS;
  else if (streak === 2) intervalMs = 3 * DAY_MS;
  else if (streak === 3) intervalMs = 7 * DAY_MS;
  else if (streak === 4) intervalMs = 14 * DAY_MS;

  return {
    streak,
    nextDueAt: new Date(now.getTime() + intervalMs),
  };
}
