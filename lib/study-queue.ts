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

export async function getRetryQueue(limit: number) {
  return prisma.card.findMany({
    where: {
      lastResult: {
        in: ["HOLD", "WRONG"],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { nextDueAt: "asc" }],
    take: limit,
  });
}

export async function getCardsByIds(ids: string[]) {
  if (!ids.length) return [];

  const cards = await prisma.card.findMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  const byId = new Map(cards.map((card) => [card.id, card]));
  return ids
    .map((id) => byId.get(id))
    .filter((card): card is (typeof cards)[number] => Boolean(card));
}
