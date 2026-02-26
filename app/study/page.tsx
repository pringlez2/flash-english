"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type StudyCard = {
  id: string;
  word: string;
  sentence: string;
  meaning_kr?: string | null;
  pron_word_kr?: string | null;
  sentence_kr?: string | null;
  pron_sentence_kr?: string | null;
};

type ReviewResult = "correct" | "hold" | "wrong";

export default function StudyPage() {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/study/today?limit=20&newLimit=10", { cache: "no-store" });
      const data = (await res.json()) as { cards?: StudyCard[]; error?: string };
      if (!res.ok) throw new Error(data.error || "학습 목록 로드 실패");
      setCards(data.cards || []);
      setIndex(0);
      setShowBack(false);
    } catch {
      setError("네트워크가 느리거나 오류가 발생했습니다. 다시 시도하세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = cards[index];
  const progress = useMemo(() => `${Math.min(index + 1, cards.length)}/${cards.length}`, [index, cards.length]);

  const review = async (result: ReviewResult) => {
    if (!current || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: current.id, result }),
      });

      if (!res.ok) throw new Error();

      const nextIndex = index + 1;
      if (nextIndex >= cards.length) {
        setCards([]);
      } else {
        setIndex(nextIndex);
      }
      setShowBack(false);
    } catch {
      setError("학습 결과 저장 실패. 다시 눌러주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-black">학습</h1>

      {loading && <p className="text-sm text-slate-600">학습 카드 불러오는 중...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !current && <p className="card text-center text-slate-600">오늘 학습할 카드가 없습니다.</p>}

      {current && (
        <>
          <div className="text-sm text-slate-600">진행: {progress}</div>
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            className="card min-h-64 w-full text-left active:scale-[0.99]"
          >
            {!showBack ? (
              <div className="flex min-h-56 flex-col justify-between space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Front</p>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black">{current.word}</h2>
                </div>
                <div className="space-y-2">
                  <p className="border-t pt-3 text-lg font-semibold text-slate-800">{current.sentence}</p>
                  <p className="text-sm text-slate-500">탭해서 뒷면 보기</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Back</p>
                <section className="space-y-1 rounded-xl border p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Word</p>
                  <p className="text-2xl font-black">{current.word}</p>
                  <p className="text-sm text-slate-700">
                    {current.meaning_kr || "-"} {current.pron_word_kr ? `(${current.pron_word_kr})` : ""}
                  </p>
                </section>
                <section className="space-y-1 rounded-xl border p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sentence</p>
                  <p className="text-lg font-semibold text-slate-900">{current.sentence}</p>
                  <p className="text-sm text-slate-700">{current.sentence_kr || "-"}</p>
                  <p className="text-sm text-slate-500">
                    {current.pron_sentence_kr ? `(${current.pron_sentence_kr})` : "-"}
                  </p>
                </section>
              </div>
            )}
          </button>

          <div className="fixed inset-x-0 bottom-0 border-t bg-white/95 p-3 backdrop-blur">
            <div className="mx-auto grid max-w-[768px] grid-cols-3 gap-2">
              <button
                className="button border-green-300 bg-green-50 text-green-700"
                disabled={submitting}
                onClick={() => review("correct")}
              >
                맞췄어
              </button>
              <button
                className="button border-amber-300 bg-amber-50 text-amber-700"
                disabled={submitting}
                onClick={() => review("hold")}
              >
                보류
              </button>
              <button
                className="button border-red-300 bg-red-50 text-red-700"
                disabled={submitting}
                onClick={() => review("wrong")}
              >
                틀렸어
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
