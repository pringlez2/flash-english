import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcReviewState, toReviewResult } from "@/lib/spaced-repetition";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      card_id?: string;
      result?: string;
    };

    const cardId = body.card_id?.trim();
    const result = body.result ? toReviewResult(body.result) : null;

    if (!cardId || !result) {
      return NextResponse.json(
        { error: "card_id and result(correct|hold|wrong) are required" },
        { status: 400 },
      );
    }

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

    const now = new Date();
    const nextState = calcReviewState(card.streak, result, now);

    await prisma.$transaction([
      prisma.review.create({
        data: {
          cardId: card.id,
          result,
          reviewedAt: now,
          nextDueAt: nextState.nextDueAt,
          streak: nextState.streak,
        },
      }),
      prisma.card.update({
        where: { id: card.id },
        data: {
          lastResult: result,
          nextDueAt: nextState.nextDueAt,
          streak: nextState.streak,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      next_due_at: nextState.nextDueAt,
      streak: nextState.streak,
    });
  } catch {
    return NextResponse.json({ error: "failed to create review" }, { status: 500 });
  }
}
