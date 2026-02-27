import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const parsedDays = Number(req.nextUrl.searchParams.get("days") || "7");
  const days = Math.min(Math.max(Number.isFinite(parsedDays) ? parsedDays : 7, 1), 30);
  const fromDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);

  const reviews = await prisma.review.findMany({
    where: {
      reviewedAt: {
        gte: fromDate,
      },
    },
    orderBy: [{ reviewedAt: "desc" }],
    take: 1000,
  });

  const byDate = new Map<string, { date: string; total: number; correct: number; hold: number; wrong: number }>();
  for (const review of reviews) {
    const date = review.reviewedAt.toISOString().slice(0, 10);
    const current = byDate.get(date) || { date, total: 0, correct: 0, hold: 0, wrong: 0 };
    current.total += 1;
    if (review.result === "CORRECT") current.correct += 1;
    else if (review.result === "HOLD") current.hold += 1;
    else current.wrong += 1;
    byDate.set(date, current);
  }

  const summaries = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({
    summaries,
  });
}
