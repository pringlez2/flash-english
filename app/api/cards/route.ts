import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromReviewResult } from "@/lib/spaced-repetition";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      word?: string;
      sentence?: string;
      meaning_kr?: string;
      pron_word_kr?: string;
      sentence_kr?: string;
      pron_sentence_kr?: string;
    };

    const word = body.word?.trim();
    const sentence = body.sentence?.trim();

    if (!word || !sentence) {
      return NextResponse.json({ error: "word and sentence are required" }, { status: 400 });
    }

    const card = await prisma.card.create({
      data: {
        word,
        sentence,
        meaningKr: body.meaning_kr?.trim() || null,
        pronWordKr: body.pron_word_kr?.trim() || null,
        sentenceKr: body.sentence_kr?.trim() || null,
        pronSentenceKr: body.pron_sentence_kr?.trim() || null,
        nextDueAt: new Date(),
      },
    });

    return NextResponse.json({
      card: {
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
      },
    });
  } catch {
    return NextResponse.json({ error: "failed to create card" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() || "";
  const parsedLimit = Number(req.nextUrl.searchParams.get("limit") || "50");
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 50;

  const cards = await prisma.card.findMany({
    where: query
      ? {
          word: {
            contains: query,
          },
        }
      : undefined,
    orderBy: [{ createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 100),
  });

  return NextResponse.json({
    cards: cards.map((card: (typeof cards)[number]) => ({
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
      created_at: card.createdAt,
      updated_at: card.updatedAt,
    })),
  });
}
