"use client";

import { useState } from "react";

type SuggestCandidate = {
  sentence: string;
  sentence_kr: string;
  pron_sentence_kr: string;
};

type SuggestResponse = {
  meaning_kr: string;
  pron_word_kr: string;
  candidates: SuggestCandidate[];
  error?: string;
};

export default function AddCardPage() {
  const [word, setWord] = useState("");
  const [sentence, setSentence] = useState("");
  const [meaningKr, setMeaningKr] = useState("");
  const [pronWordKr, setPronWordKr] = useState("");
  const [sentenceKr, setSentenceKr] = useState("");
  const [pronSentenceKr, setPronSentenceKr] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestCandidate[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [message, setMessage] = useState("");

  const suggest = async () => {
    if (!word.trim()) {
      setMessage("단어를 먼저 입력하세요.");
      return;
    }

    setMessage("");
    setLoadingSuggest(true);
    try {
      const res = await fetch("/api/sentences/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.trim() }),
      });

      const data = (await res.json()) as SuggestResponse;
      if (!res.ok || !data.candidates?.length) throw new Error(data.error || "추천 실패");

      setSuggestions(data.candidates);
      setMeaningKr(data.meaning_kr || "");
      setPronWordKr(data.pron_word_kr || "");
      const first = data.candidates[0];
      setSentence(first.sentence);
      setSentenceKr(first.sentence_kr);
      setPronSentenceKr(first.pron_sentence_kr);
      setPicked(first.sentence);
    } catch {
      setMessage("예문 추천 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setLoadingSuggest(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !sentence.trim()) {
      setMessage("word, sentence는 필수입니다.");
      return;
    }

    setLoadingSave(true);
    setMessage("");
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.trim(),
          sentence: sentence.trim(),
          meaning_kr: meaningKr.trim() || undefined,
          pron_word_kr: pronWordKr.trim() || undefined,
          sentence_kr: sentenceKr.trim() || undefined,
          pron_sentence_kr: pronSentenceKr.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error();

      setMessage("저장 완료");
      setWord("");
      setSentence("");
      setMeaningKr("");
      setPronWordKr("");
      setSentenceKr("");
      setPronSentenceKr("");
      setSuggestions([]);
      setPicked("");
    } catch {
      setMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-black">단어 추가하기</h1>
      <form onSubmit={save} className="card space-y-3">
        <input className="input" placeholder="word (필수)" value={word} onChange={(e) => setWord(e.target.value)} />
        <input className="input" placeholder="meaning_kr (선택)" value={meaningKr} onChange={(e) => setMeaningKr(e.target.value)} />
        <input className="input" placeholder="pron_word_kr (선택)" value={pronWordKr} onChange={(e) => setPronWordKr(e.target.value)} />

        <button type="button" className="button" onClick={suggest} disabled={loadingSuggest}>
          {loadingSuggest ? "추천 중..." : "예문 추천받기"}
        </button>

        {suggestions.length > 0 && (
          <fieldset className="space-y-2 rounded-xl border p-3">
            <legend className="px-1 text-sm font-semibold">추천 예문 3개</legend>
            {suggestions.map((item) => (
              <label key={item.sentence} className="flex min-h-11 items-start gap-2 rounded-lg border p-2">
                <input
                  type="radio"
                  checked={picked === item.sentence}
                  onChange={() => {
                    setPicked(item.sentence);
                    setSentence(item.sentence);
                    setSentenceKr(item.sentence_kr);
                    setPronSentenceKr(item.pron_sentence_kr);
                  }}
                />
                <span>
                  <strong className="block">{item.sentence}</strong>
                  <span className="block text-sm text-slate-600">{item.sentence_kr}</span>
                  <span className="block text-sm text-slate-500">{item.pron_sentence_kr}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <textarea
          className="textarea"
          placeholder="sentence (필수)"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
        />

        <input className="input" placeholder="sentence_kr (선택)" value={sentenceKr} onChange={(e) => setSentenceKr(e.target.value)} />
        <input
          className="input"
          placeholder="pron_sentence_kr (선택)"
          value={pronSentenceKr}
          onChange={(e) => setPronSentenceKr(e.target.value)}
        />

        <button className="button" disabled={loadingSave}>
          {loadingSave ? "저장 중..." : "저장"}
        </button>
      </form>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </main>
  );
}
