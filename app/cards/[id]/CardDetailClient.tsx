"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CardDetail = {
  id: string;
  word: string;
  sentence: string;
  meaning_kr?: string | null;
  pron_word_kr?: string | null;
  sentence_kr?: string | null;
  pron_sentence_kr?: string | null;
};

export default function CardDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/cards/${id}`, { cache: "no-store" });
      const data = (await res.json()) as { card?: CardDetail };
      if (active) {
        setCard(data.card || null);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;

    setMessage("");
    const res = await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });

    if (!res.ok) {
      setMessage("저장 실패");
      return;
    }

    setMessage("저장 완료");
  };

  const removeCard = async () => {
    const ok = window.confirm("이 카드를 삭제할까요?");
    if (!ok) return;

    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/cards");
    } catch {
      setMessage("삭제 실패");
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-600">불러오는 중...</p>;
  if (!card) return <p className="text-sm text-red-600">카드를 찾을 수 없습니다.</p>;

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-black">카드 상세/편집</h1>
      <form onSubmit={save} className="card space-y-3">
        <input className="input" value={card.word} onChange={(e) => setCard({ ...card, word: e.target.value })} />
        <textarea
          className="textarea"
          value={card.sentence}
          onChange={(e) => setCard({ ...card, sentence: e.target.value })}
        />
        <input
          className="input"
          value={card.meaning_kr || ""}
          onChange={(e) => setCard({ ...card, meaning_kr: e.target.value })}
          placeholder="meaning_kr"
        />
        <input
          className="input"
          value={card.pron_word_kr || ""}
          onChange={(e) => setCard({ ...card, pron_word_kr: e.target.value })}
          placeholder="pron_word_kr"
        />
        <input
          className="input"
          value={card.sentence_kr || ""}
          onChange={(e) => setCard({ ...card, sentence_kr: e.target.value })}
          placeholder="sentence_kr"
        />
        <input
          className="input"
          value={card.pron_sentence_kr || ""}
          onChange={(e) => setCard({ ...card, pron_sentence_kr: e.target.value })}
          placeholder="pron_sentence_kr"
        />
        <button className="button">저장</button>
        <button
          type="button"
          className="button border-red-200 bg-red-50 text-red-700"
          disabled={deleting}
          onClick={() => void removeCard()}
        >
          {deleting ? "삭제 중..." : "이 카드 삭제"}
        </button>
      </form>
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </main>
  );
}
