import { NextRequest, NextResponse } from "next/server";
import { getCardsByIds, getRetryQueue, getStudyQueue } from "@/lib/study-queue";
import { fromReviewResult } from "@/lib/spaced-repetition";

export async function GET(req: NextRequest) {
  const parsedLimit = Number(req.nextUrl.searchParams.get("limit") || "20");
  const parsedNewLimit = Number(req.nextUrl.searchParams.get("newLimit") || "10");
  const mode = req.nextUrl.searchParams.get("mode") || "today";
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .slice(0, 100);
  const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 20, 1), 100);
  const newLimit = Math.min(Math.max(Number.isFinite(parsedNewLimit) ? parsedNewLimit : 10, 0), 100);

  const cards =
    ids.length > 0
      ? await getCardsByIds(ids)
      : mode === "retry"
        ? await getRetryQueue(limit)
        : await getStudyQueue(limit, newLimit);

  return NextResponse.json({
    cards: cards.map((card) => ({
      id: card.id,
      word: card.word,
      sentence: card.sentence,
      meaning_kr: card.meaningKr,
      pron_word_kr: card.pronWordKr,
      sentence_kr: card.sentenceKr,
      pron_sentence_kr: card.pronSentenceKr,
      last_result: fromReviewResult(card.lastResult),
      next_due_at: card.nextDueAt,
      streak: card.streak,
    })),
  });
}
