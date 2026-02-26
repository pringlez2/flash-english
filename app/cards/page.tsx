"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Card = {
  id: string;
  word: string;
  sentence: string;
  streak: number;
  last_result: "correct" | "hold" | "wrong" | null;
  created_at: string;
  next_due_at: string;
};

const formatDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

const resultMeta: Record<string, { label: string; className: string }> = {
  correct: { label: "정답", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  hold: { label: "보류", className: "bg-amber-50 text-amber-700 border-amber-200" },
  wrong: { label: "오답", className: "bg-rose-50 text-rose-700 border-rose-200" },
  none: { label: "미학습", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function CardsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const res = await fetch(`/api/cards?query=${encodeURIComponent(query)}&limit=50`, { cache: "no-store" });
      const data = (await res.json()) as { cards: Card[] };
      if (active) {
        const nextCards = data.cards || [];
        setCards(nextCards);
        setSelectedIds((prev) => prev.filter((id) => nextCards.some((card) => card.id === id)));
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
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    } catch {
      window.alert("삭제 실패. 다시 시도해주세요.");
    } finally {
      setDeletingId("");
    }
  };

  const groupedCards = cards.reduce<Record<string, Card[]>>((acc, card) => {
    const dateKey = card.created_at.slice(0, 10);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(card);
    return acc;
  }, {});

  const groupEntries = Object.entries(groupedCards);

  const toggleCard = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleDateGroup = (group: Card[]) => {
    const groupIds = group.map((card) => card.id);
    const allSelected = groupIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => {
      if (allSelected) return prev.filter((id) => !groupIds.includes(id));
      return Array.from(new Set([...prev, ...groupIds]));
    });
  };

  const startSelectedStudy = () => {
    if (!selectedIds.length) return;
    router.push(`/study?ids=${encodeURIComponent(selectedIds.join(","))}`);
  };

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-black">카드 목록</h1>
      <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="단어 검색" />
      <button type="button" className="button" disabled={selectedIds.length === 0} onClick={startSelectedStudy}>
        선택 카드 학습하기 ({selectedIds.length})
      </button>

      <section className="card">
        {loading && <p className="text-sm text-slate-600">불러오는 중...</p>}
        {!loading && cards.length === 0 && <p className="text-sm text-slate-600">검색 결과가 없습니다.</p>}
        <div className="space-y-4">
          {groupEntries.map(([dateKey, group]) => (
            <section key={dateKey} className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1">
                <h2 className="text-sm font-bold text-slate-700">{formatDateLabel(group[0].created_at)}</h2>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={group.every((card) => selectedIds.includes(card.id))}
                    onChange={() => toggleDateGroup(group)}
                  />
                  날짜 전체 선택
                </label>
              </div>
              <ul className="space-y-2">
                {group.map((card) => {
                  const result = card.last_result ? resultMeta[card.last_result] : resultMeta.none;
                  return (
                    <li key={card.id}>
                      <div className="rounded-xl border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(card.id)}
                            onChange={() => toggleCard(card.id)}
                            className="h-4 w-4"
                            aria-label={`${card.word} 선택`}
                          />
                          <Link href={`/cards/${card.id}`} className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">{card.word}</span>
                              <span className="text-xs text-slate-500">streak {card.streak}</span>
                            </div>
                            <p className="line-clamp-1 text-sm text-slate-600">{card.sentence}</p>
                            <div className="mt-2">
                              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${result.className}`}>
                                학습결과: {result.label}
                              </span>
                            </div>
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
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
