import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateSentenceCandidates,
  type SentenceCandidate,
  type SuggestPayload,
} from "@/lib/sentence-suggest";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      word?: string;
      topic?: string;
      tense?: string;
    };

    const word = body.word?.trim();
    if (!word) {
      return NextResponse.json({ error: "word is required" }, { status: 400 });
    }

    const existing: Array<{
      sentence: string;
      sentenceKr: string | null;
      pronSentenceKr: string | null;
      meaningKr: string | null;
      pronWordKr: string | null;
    }> = await prisma.card.findMany({
      where: {
        word: {
          equals: word,
        },
      },
      select: { sentence: true, sentenceKr: true, pronSentenceKr: true, meaningKr: true, pronWordKr: true },
      take: 3,
    });

    const reused: SentenceCandidate[] = existing
      .map((item: (typeof existing)[number]) => ({
        sentence: item.sentence.trim(),
        sentence_kr: item.sentenceKr?.trim() || "",
        pron_sentence_kr: item.pronSentenceKr?.trim() || "",
      }))
      .filter((item: SentenceCandidate) => item.sentence && item.sentence_kr && item.pron_sentence_kr);

    const existingMeaning = existing.map((item: (typeof existing)[number]) => item.meaningKr?.trim() || "").find(Boolean) || "";
    const existingPronWord = existing.map((item: (typeof existing)[number]) => item.pronWordKr?.trim() || "").find(Boolean) || "";

    if (reused.length === 3 && existingMeaning && existingPronWord) {
      return NextResponse.json({
        meaning_kr: existingMeaning,
        pron_word_kr: existingPronWord,
        candidates: reused,
      });
    }

    const generated = await generateSentenceCandidates(word, body.topic, body.tense);
    const merged = new Map<string, SentenceCandidate>();
    [...reused, ...generated.candidates].forEach((item) => {
      const key = item.sentence.trim().toLowerCase();
      if (!key || merged.has(key)) return;
      merged.set(key, {
        sentence: item.sentence.trim(),
        sentence_kr: item.sentence_kr.trim(),
        pron_sentence_kr: item.pron_sentence_kr.trim(),
      });
    });

    const fallbacks: SentenceCandidate[] = [
      {
        sentence: `I use ${word} every day.`,
        sentence_kr: "나는 매일 그것을 사용해.",
        pron_sentence_kr: "아이 유즈 잇 에브리 데이",
      },
      {
        sentence: `Do you need ${word} now?`,
        sentence_kr: "너 지금 그게 필요해?",
        pron_sentence_kr: "두 유 니드 잇 나우",
      },
      {
        sentence: `We bring ${word} to work.`,
        sentence_kr: "우리는 그것을 회사에 가져가.",
        pron_sentence_kr: "위 브링 잇 투 워크",
      },
    ];

    for (const fallback of fallbacks) {
      if (merged.size >= 3) break;
      const key = fallback.sentence.toLowerCase();
      if (!merged.has(key)) merged.set(key, fallback);
    }

    const payload: SuggestPayload = {
      meaning_kr: existingMeaning || generated.meaning_kr,
      pron_word_kr: existingPronWord || generated.pron_word_kr,
      candidates: Array.from(merged.values()).slice(0, 3),
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "failed to generate suggestions" }, { status: 500 });
  }
}
