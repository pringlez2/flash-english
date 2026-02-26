import { prisma } from "@/lib/prisma";

export async function getStudyQueue(limit: number, newLimit: number) {
  const now = new Date();

  const reviewedCards = await prisma.card.findMany({
    where: {
      nextDueAt: { lte: now },
      reviews: { some: {} },
    },
    orderBy: [{ nextDueAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const remain = Math.max(0, limit - reviewedCards.length);
  const allowedNew = Math.min(newLimit, remain);

  const newCards =
    allowedNew > 0
      ? await prisma.card.findMany({
          where: {
            nextDueAt: { lte: now },
            reviews: { none: {} },
          },
          orderBy: [{ createdAt: "asc" }],
          take: allowedNew,
        })
      : [];

  return [...reviewedCards, ...newCards];
}
