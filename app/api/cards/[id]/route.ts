import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromReviewResult } from "@/lib/spaced-repetition";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

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
      created_at: card.createdAt,
      updated_at: card.updatedAt,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

    const card = await prisma.card.update({
      where: { id },
      data: {
        word,
        sentence,
        meaningKr: body.meaning_kr?.trim() || null,
        pronWordKr: body.pron_word_kr?.trim() || null,
        sentenceKr: body.sentence_kr?.trim() || null,
        pronSentenceKr: body.pron_sentence_kr?.trim() || null,
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
    return NextResponse.json({ error: "failed to update card" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.card.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed to delete card" }, { status: 500 });
  }
}
