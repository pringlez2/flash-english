"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Card = {
  id: string;
  word: string;
  sentence: string;
  streak: number;
  next_due_at: string;
};

export default function CardsPage() {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string>("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const res = await fetch(`/api/cards?query=${encodeURIComponent(query)}&limit=50`, { cache: "no-store" });
      const data = (await res.json()) as { cards: Card[] };
      if (active) {
        setCards(data.cards || []);
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void run();
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const removeCard = async (id: string) => {
    if (deletingId) return;
    const ok = window.confirm("이 카드를 삭제할까요?");
    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCards((prev) => prev.filter((card) => card.id !== id));
    } catch {
      window.alert("삭제 실패. 다시 시도해주세요.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-black">카드 목록</h1>
      <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="단어 검색" />

      <section className="card">
        {loading && <p className="text-sm text-slate-600">불러오는 중...</p>}
        {!loading && cards.length === 0 && <p className="text-sm text-slate-600">검색 결과가 없습니다.</p>}
        <ul className="space-y-2">
          {cards.map((card) => (
            <li key={card.id}>
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/cards/${card.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{card.word}</span>
                      <span className="text-xs text-slate-500">streak {card.streak}</span>
                    </div>
                    <p className="line-clamp-1 text-sm text-slate-600">{card.sentence}</p>
                  </Link>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600"
                    disabled={deletingId === card.id}
                    onClick={() => void removeCard(card.id)}
                  >
                    {deletingId === card.id ? "삭제중" : "삭제"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
