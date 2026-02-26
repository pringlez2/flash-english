import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStudyQueue } from "@/lib/study-queue";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let todayQueue: Array<{ id: string }> = [];
  let recentCards: Array<{ id: string; word: string; sentence: string }> = [];
  let loadError = false;

  try {
    [todayQueue, recentCards] = await Promise.all([
      getStudyQueue(20, 10),
      prisma.card.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
  } catch {
    loadError = true;
  }

  return (
    <main className="space-y-4">
      <section className="card space-y-3">
        <h1 className="text-2xl font-black">오늘 학습</h1>
        {loadError && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            데이터 로딩에 실패했습니다. 잠시 후 새로고침해주세요.
          </p>
        )}
        <p className="text-sm text-slate-600">반복학습이 필요한 카드 {todayQueue.length}장</p>
        <Link href="/study" className="button block text-center">
          오늘 학습하기 ({todayQueue.length}장)
        </Link>
        <Link href="/add" className="button block text-center">
          단어 추가하기
        </Link>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">최근 카드 10개</h2>
        <ul className="space-y-2">
          {recentCards.length === 0 && <li className="text-sm text-slate-500">아직 카드가 없습니다.</li>}
          {recentCards.map((card) => (
            <li key={card.id}>
              <Link href={`/cards/${card.id}`} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="font-semibold">{card.word}</span>
                <span className="text-sm text-slate-500 line-clamp-1">{card.sentence}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
