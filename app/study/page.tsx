"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
type StudyMode = "today" | "retry" | "selected";
type QuizMode = "en_to_ko" | "ko_to_en";

type RecentSummary = {
  date: string;
  total: number;
  correct: number;
  hold: number;
  wrong: number;
};

const formatDateLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

export default function StudyPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const speechTimerRef = useRef<number | null>(null);
  const [screen, setScreen] = useState<"home" | "session">("home");
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<StudyMode>("today");
  const [quizMode, setQuizMode] = useState<QuizMode>("en_to_ko");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [didFinishSpeech, setDidFinishSpeech] = useState(false);
  const [cardHeight, setCardHeight] = useState(480);
  const [recent, setRecent] = useState<RecentSummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const load = useCallback(async (nextMode: StudyMode = "today", selectedIds: string[] = []) => {
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

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch("/api/reviews/recent?days=7", { cache: "no-store" });
      const data = (await res.json()) as { summaries?: RecentSummary[] };
      if (!res.ok) throw new Error();
      setRecent(data.summaries || []);
    } catch {
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const startSession = useCallback(
    async (nextMode: StudyMode, selectedIds: string[] = []) => {
      setScreen("session");
      const search =
        nextMode === "selected" && selectedIds.length > 0
          ? `session=1&mode=selected&ids=${encodeURIComponent(selectedIds.join(","))}`
          : `session=1&mode=${nextMode}`;
      router.replace(`/study?${search}`);
      await load(nextMode, selectedIds);
    },
    [load, router],
  );

  const goHome = useCallback(() => {
    setScreen("home");
    setError("");
    setCards([]);
    setIndex(0);
    setShowBack(false);
    router.replace("/study");
    void loadRecent();
  }, [loadRecent, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ids = (params.get("ids") || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .slice(0, 100);

    if (ids.length > 0) {
      setScreen("session");
      window.history.replaceState(
        null,
        "",
        `/study?session=1&mode=selected&ids=${encodeURIComponent(ids.join(","))}`,
      );
      void load("selected", ids);
      return;
    }

    if (params.get("session") === "1") {
      setScreen("session");
      void load(params.get("mode") === "retry" ? "retry" : "today");
      return;
    }

    setScreen("home");
    void loadRecent();
  }, [load, loadRecent]);

  useEffect(() => {
    if (screen !== "session" || typeof window === "undefined") return;

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
  }, [screen, loading, cards.length, index, showBack]);

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

  const toggleQuizMode = () => {
    stopSpeech();
    const nextMode = quizMode === "en_to_ko" ? "ko_to_en" : "en_to_ko";
    setQuizMode(nextMode);
    setVoiceEnabled(nextMode === "en_to_ko");
    setShowBack(false);
    setDidFinishSpeech(false);
  };

  const pickPreferredVoice = useCallback((language: "en" | "ko") => {
    if (typeof window === "undefined") return null;

    const voices = window.speechSynthesis.getVoices();
    const targetVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(language));
    if (targetVoices.length === 0) return null;
    if (language === "en") {
      return targetVoices.find((voice) => voice.name === "Google US English") || targetVoices[0];
    }
    return targetVoices[0];
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window === "undefined") return;
    if (speechTimerRef.current) {
      window.clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const speakFront = useCallback(() => {
    if (typeof window === "undefined" || !current || !voiceEnabled) return;
    stopSpeech();

    const word =
      quizMode === "en_to_ko" ? current.word.trim() : (current.meaning_kr || "").trim();
    const sentence =
      quizMode === "en_to_ko" ? current.sentence.trim() : (current.sentence_kr || "").trim();
    if (!word && !sentence) return;
    const voice = pickPreferredVoice(quizMode === "en_to_ko" ? "en" : "ko");
    const lang = quizMode === "en_to_ko" ? "en-US" : "ko-KR";
    setIsSpeaking(true);
    setIsPaused(false);
    setDidFinishSpeech(false);

    if (word) {
      const wordUtterance = new SpeechSynthesisUtterance(word);
      wordUtterance.lang = lang;
      if (voice) wordUtterance.voice = voice;
      wordUtterance.rate = 0.82;
      wordUtterance.pitch = 1.02;
      window.speechSynthesis.speak(wordUtterance);
    }

    speechTimerRef.current = window.setTimeout(() => {
      if (!sentence) {
        setIsSpeaking(false);
        setIsPaused(false);
        setDidFinishSpeech(true);
        return;
      }
      const sentenceUtterance = new SpeechSynthesisUtterance(sentence);
      sentenceUtterance.lang = lang;
      if (voice) sentenceUtterance.voice = voice;
      sentenceUtterance.rate = 0.82;
      sentenceUtterance.pitch = 1.02;
      sentenceUtterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setDidFinishSpeech(true);
      };
      window.speechSynthesis.speak(sentenceUtterance);
      speechTimerRef.current = null;
    }, 1000);
  }, [current, pickPreferredVoice, quizMode, stopSpeech, voiceEnabled]);

  const speakEnglishGuide = useCallback(() => {
    if (typeof window === "undefined" || !current) return;
    stopSpeech();

    const word = current.word.trim();
    const sentence = current.sentence.trim();
    if (!word && !sentence) return;

    const voice = pickPreferredVoice("en");
    setIsSpeaking(true);
    setIsPaused(false);
    setDidFinishSpeech(false);

    if (word) {
      const wordUtterance = new SpeechSynthesisUtterance(word);
      wordUtterance.lang = "en-US";
      if (voice) wordUtterance.voice = voice;
      wordUtterance.rate = 0.82;
      wordUtterance.pitch = 1.02;
      window.speechSynthesis.speak(wordUtterance);
    }

    speechTimerRef.current = window.setTimeout(() => {
      if (!sentence) {
        setIsSpeaking(false);
        setIsPaused(false);
        setDidFinishSpeech(true);
        return;
      }
      const sentenceUtterance = new SpeechSynthesisUtterance(sentence);
      sentenceUtterance.lang = "en-US";
      if (voice) sentenceUtterance.voice = voice;
      sentenceUtterance.rate = 0.82;
      sentenceUtterance.pitch = 1.02;
      sentenceUtterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setDidFinishSpeech(true);
      };
      window.speechSynthesis.speak(sentenceUtterance);
      speechTimerRef.current = null;
    }, 1000);
  }, [current, pickPreferredVoice, stopSpeech]);

  const toggleVoiceEnabled = () => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (!next) stopSpeech();
      return next;
    });
  };

  const handleSpeechButton = () => {
    if (typeof window === "undefined") return;

    if (!isSpeaking) {
      void speakFront();
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const handleBackSpeechButton = () => {
    if (typeof window === "undefined") return;

    if (!isSpeaking) {
      void speakEnglishGuide();
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  useEffect(() => {
    if (screen !== "session" || loading || !current || showBack || !voiceEnabled) return;
    speakFront();
    return () => stopSpeech();
  }, [screen, loading, current, showBack, quizMode, speakFront, stopSpeech, voiceEnabled]);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  if (screen === "home") {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-black">학습</h1>

        <section className="space-y-2">
          <button type="button" className="button" disabled={loading} onClick={() => void startSession("today")}>
            오늘 학습
          </button>
          <button type="button" className="button" disabled={loading} onClick={() => void startSession("retry")}>
            보류/오답 재학습
          </button>
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg font-bold">최근 학습 내역</h2>
          {recentLoading && <p className="text-sm text-slate-600">최근 학습 내역 불러오는 중...</p>}
          {!recentLoading && recent.length === 0 && (
            <p className="text-sm text-slate-600">아직 학습 내역이 없습니다.</p>
          )}
          {!recentLoading && recent.length > 0 && (
            <ul className="space-y-2">
              {recent.map((item) => {
                return (
                  <li key={item.date} className="rounded-xl border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-bold">{formatDateLabel(item.date)}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                        총 {item.total}건
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-center font-semibold text-emerald-700">
                        맞춤 {item.correct}
                      </span>
                      <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-center font-semibold text-amber-700">
                        보류 {item.hold}
                      </span>
                      <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-center font-semibold text-rose-700">
                        틀림 {item.wrong}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex items-start justify-between pt-1">
        <button type="button" className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={goHome}>
          ← 뒤로
        </button>
        <div className="flex items-center gap-2">
          <p className="pt-1 text-xs text-slate-500">
            현재 모드: {mode === "today" ? "오늘 학습" : mode === "retry" ? "보류/오답 재학습" : "선택 카드 학습"}
          </p>
          <button type="button" className="rounded-lg border px-3 py-1 text-xs font-semibold" onClick={toggleVoiceEnabled}>
            음성 {voiceEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-600">학습 카드 불러오는 중...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !current && (
        <section className="card space-y-3 text-center">
          <p className="text-slate-600">학습할 카드가 없습니다.</p>
          <button type="button" className="button" onClick={goHome}>
            학습 홈으로 돌아가기
          </button>
        </section>
      )}

      {current && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">진행: {progress}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-1 text-xs font-semibold"
                onClick={toggleQuizMode}
              >
                {quizMode === "en_to_ko" ? "영어→한글" : "한글→영어"}
              </button>
              <button type="button" className="rounded-lg border px-3 py-1 text-xs font-semibold" onClick={reshuffle}>
                순서 재설정
              </button>
            </div>
          </div>
          <div
            ref={cardRef}
            onClick={() => setShowBack((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowBack((v) => !v);
              }
            }}
            role="button"
            tabIndex={0}
            className="card w-full text-left active:scale-[0.99]"
            style={{ height: `${cardHeight}px` }}
          >
            {!showBack ? (
              <div className="flex h-full flex-col justify-between space-y-3">
                <div className="-mx-4 -mt-4">
                  <div className="h-60 w-full rounded-t-2xl border-b bg-slate-200" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-4xl font-black">
                      {quizMode === "en_to_ko" ? current.word : current.meaning_kr || "-"}
                    </h2>
                    {voiceEnabled && (
                      <button
                        type="button"
                        className="rounded-lg border px-2 py-1 text-xs font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeechButton();
                        }}
                        aria-label={
                          isSpeaking ? (isPaused ? "음성 재생" : "음성 일시정지") : didFinishSpeech ? "음성 다시 실행" : "음성 재생"
                        }
                        title={
                          isSpeaking ? (isPaused ? "음성 재생" : "음성 일시정지") : didFinishSpeech ? "음성 다시 실행" : "음성 재생"
                        }
                      >
                        {isSpeaking ? (isPaused ? "▶" : "⏸") : didFinishSpeech ? "↺" : "▶"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="border-t pt-3 text-lg font-semibold text-slate-800">
                    {quizMode === "en_to_ko" ? current.sentence : current.sentence_kr || "-"}
                  </p>
                  <p className="text-sm text-slate-500">탭해서 뒷면 보기</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-start gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Back</p>
                  {
                    <button
                      type="button"
                      className="rounded-lg border px-2 py-1 text-xs font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBackSpeechButton();
                      }}
                      aria-label={
                        isSpeaking ? (isPaused ? "음성 재생" : "음성 일시정지") : didFinishSpeech ? "음성 다시 실행" : "음성 재생"
                      }
                      title={
                        isSpeaking ? (isPaused ? "음성 재생" : "음성 일시정지") : didFinishSpeech ? "음성 다시 실행" : "음성 재생"
                      }
                    >
                      {isSpeaking ? (isPaused ? "▶" : "⏸") : didFinishSpeech ? "↺" : "▶"}
                    </button>
                  }
                </div>
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
          </div>

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
