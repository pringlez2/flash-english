import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.card.count();
  if (count > 0) return;

  await prisma.card.createMany({
    data: [
      {
        word: "both",
        sentence: "They both like cake after lunch.",
        meaningKr: "둘 다",
      },
      {
        word: "borrow",
        sentence: "Can I borrow your pen today?",
        meaningKr: "빌리다",
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
