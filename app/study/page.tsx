"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"today" | "retry" | "selected">("today");
  const [cardHeight, setCardHeight] = useState(480);
  const load = useCallback(async (nextMode: "today" | "retry" | "selected" = "today", selectedIds: string[] = []) => {
    setLoading(true);
    setError("");

    const query =
      nextMode === "selected" && selectedIds.length > 0
        ? `/api/study/today?ids=${encodeURIComponent(selectedIds.join(","))}`
        : nextMode === "retry"
          ? "/api/study/today?mode=retry&limit=50"
          : "/api/study/today?limit=20&newLimit=10";

    try {
      const res = await fetch(query, { cache: "no-store" });
      const data = (await res.json()) as { cards?: StudyCard[]; error?: string };
      if (!res.ok) throw new Error(data.error || "학습 목록 로드 실패");
      setCards(data.cards || []);
      setIndex(0);
      setShowBack(false);
      setMode(nextMode);
    } catch {
      setError("네트워크가 느리거나 오류가 발생했습니다. 다시 시도하세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ids = (new URLSearchParams(window.location.search).get("ids") || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .slice(0, 100);
    void load(ids.length > 0 ? "selected" : "today", ids);
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;

      const updateHeight = () => {
        if (!cardRef.current) return;
        const top = cardRef.current.getBoundingClientRect().top;
        const footerHeight = 108;
        const bottomGap = 12;
        const next = Math.floor(window.innerHeight - top - footerHeight - bottomGap);
        setCardHeight(Math.max(280, next));
      };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, [loading, cards.length, index, showBack]);

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

  const reshuffle = () => {
    setCards((prev) => {
      if (prev.length <= 1) return prev;
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setIndex(0);
    setShowBack(false);
  };

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-black">학습</h1>
      <div className="flex gap-2">
        <button type="button" className="button" disabled={loading || submitting} onClick={() => void load("today")}>
          오늘 학습
        </button>
        <button type="button" className="button" disabled={loading || submitting} onClick={() => void load("retry")}>
          보류/오답 재학습
        </button>
      </div>
      <p className="text-xs text-slate-600">
        현재 모드: {mode === "today" ? "오늘 학습" : mode === "retry" ? "보류/오답 재학습" : "선택 카드 학습"}
      </p>

      {loading && <p className="text-sm text-slate-600">학습 카드 불러오는 중...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !current && <p className="card text-center text-slate-600">학습할 카드가 없습니다.</p>}

      {current && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">진행: {progress}</div>
            <button type="button" className="rounded-lg border px-3 py-1 text-xs font-semibold" onClick={reshuffle}>
              순서 재설정
            </button>
          </div>
          <button
            ref={cardRef}
            type="button"
            onClick={() => setShowBack((v) => !v)}
            className="card w-full text-left active:scale-[0.99]"
            style={{ height: `${cardHeight}px` }}
          >
            {!showBack ? (
              <div className="flex h-full flex-col justify-between space-y-3">
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
              <div className="flex h-full flex-col justify-start gap-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Back</p>
                <section className="flex flex-1 flex-col justify-start space-y-1 rounded-xl border p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Word</p>
                  <p className="text-2xl font-black">{current.word}</p>
                  <p className="text-sm text-slate-700">
                    {current.meaning_kr || "-"} {current.pron_word_kr ? `(${current.pron_word_kr})` : ""}
                  </p>
                </section>
                <section className="flex flex-1 flex-col justify-start space-y-1 rounded-xl border p-3">
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
