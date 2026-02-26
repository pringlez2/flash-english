import { ReviewResult } from "@prisma/client";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function toReviewResult(value: string): ReviewResult | null {
  if (value === "correct") return ReviewResult.CORRECT;
  if (value === "hold") return ReviewResult.HOLD;
  if (value === "wrong") return ReviewResult.WRONG;
  return null;
}

export function fromReviewResult(value: ReviewResult | null): "correct" | "hold" | "wrong" | null {
  if (value === ReviewResult.CORRECT) return "correct";
  if (value === ReviewResult.HOLD) return "hold";
  if (value === ReviewResult.WRONG) return "wrong";
  return null;
}

export function calcReviewState(currentStreak: number, result: ReviewResult, now = new Date()) {
  if (result === ReviewResult.WRONG) {
    return {
      streak: 0,
      nextDueAt: new Date(now.getTime() + 10 * MINUTE_MS),
    };
  }

  if (result === ReviewResult.HOLD) {
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
