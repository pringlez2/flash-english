export type SentenceCandidate = {
  sentence: string;
  sentence_kr: string;
  pron_sentence_kr: string;
};

export type SuggestPayload = {
  meaning_kr: string;
  pron_word_kr: string;
  candidates: SentenceCandidate[];
};

type ResponsesApiOutput = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
};

const SYSTEM_PROMPT = `You are an English-learning sentence generator for Korean beginners.
Follow all rules strictly.

[Sentence rules]
- CEFR A1-A2
- 6-10 words
- Focus on one target word only
- Easy vocabulary only
- Prefer I/you/we/they as subject
- No advanced grammar

[Diversity]
1) positive sentence
2) negative or question
3) daily-life context (family/work/meal/transport)

[Forbidden]
- politics, hate, sexual, violent themes

Return JSON only.
Schema: {"meaning_kr":"...","pron_word_kr":"...","candidates":[{"sentence":"...","sentence_kr":"...","pron_sentence_kr":"..."},{"sentence":"...","sentence_kr":"...","pron_sentence_kr":"..."},{"sentence":"...","sentence_kr":"...","pron_sentence_kr":"..."}]}

Important:
- "meaning_kr" must be a natural Korean meaning of the target word.
- "pron_word_kr" must be Korean-style pronunciation of the target word.
- In "sentence_kr", do NOT leave the English target word as-is. Translate it into Korean meaning.
- "pron_sentence_kr" must be phonetic Korean transcription of the ENGLISH sentence sound, not translation.
- Never copy "sentence_kr" into "pron_sentence_kr".
- Example:
  sentence: "Do you like both coffee and tea?"
  sentence_kr: "너는 커피와 차 둘 다 좋아하니?"
  pron_sentence_kr: "두 유 라이크 보우스 커피 앤 티"`; 

const RETRY_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

You failed formatting before. Fix strictly:
- pron_sentence_kr must sound like English pronunciation written in Hangul.
- pron_sentence_kr must not equal sentence_kr for any candidate.`;

function fallbackPayload(word: string): SuggestPayload {
  const w = word.trim();
  return {
    meaning_kr: "뜻 확인 필요",
    pron_word_kr: "발음 확인 필요",
    candidates: [
      {
        sentence: `I use ${w} every day at home.`,
        sentence_kr: "나는 집에서 매일 그것을 사용해.",
        pron_sentence_kr: "아이 유즈 잇 에브리 데이 앳 홈",
      },
      {
        sentence: `Do you need ${w} right now?`,
        sentence_kr: "너 지금 그게 필요해?",
        pron_sentence_kr: "두 유 니드 잇 라잇 나우",
      },
      {
        sentence: `We carry ${w} on the bus.`,
        sentence_kr: "우리는 버스에서 그것을 들고 가.",
        pron_sentence_kr: "위 캐리 잇 온 더 버스",
      },
    ],
  };
}

function extractText(data: ResponsesApiOutput): string {
  if (data.output_text?.trim()) return data.output_text.trim();
  const chunks =
    data.output
      ?.flatMap((o) => o.content || [])
      .filter((c) => c.type === "output_text" || c.type === "text")
      .map((c) => c.text || "")
      .join("\n")
      .trim() || "";
  return chunks;
}

function parsePayload(text: string): SuggestPayload | null {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const direct = tryParse(cleaned);
  if (direct) return direct;

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return tryParse(cleaned.slice(start, end + 1));
  }
  return null;
}

function tryParse(value: string): SuggestPayload | null {
  try {
    return JSON.parse(value) as SuggestPayload;
  } catch {
    return null;
  }
}

export async function generateSentenceCandidates(
  word: string,
  topic?: string,
  tense?: string,
): Promise<SuggestPayload> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return fallbackPayload(word);

  const model = process.env.LLM_MODEL || "gpt-4.1-mini";

  const userPrompt = [
    `Target word: ${word}`,
    `Topic: ${topic || "general daily life"}`,
    `Tense preference: ${tense || "present"}`,
  ].join("\n");

  const first = await callModel(apiKey, model, SYSTEM_PROMPT, userPrompt);
  if (first) return first;

  const retried = await callModel(apiKey, model, RETRY_SYSTEM_PROMPT, userPrompt);
  if (retried) return retried;

  return fallbackPayload(word);
}

function isValidPronunciationLine(sentenceKr: string, pron: string) {
  const a = sentenceKr.replace(/\s+/g, "").trim();
  const b = pron.replace(/\s+/g, "").trim();
  if (!a || !b) return false;
  if (a === b) return false;
  return true;
}

async function callModel(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<SuggestPayload | null> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: 260,
      temperature: 0.5,
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as ResponsesApiOutput;
  const text = extractText(data);
  if (!text) return null;

  const parsed = parsePayload(text);
  if (!parsed) return null;

  const candidates = parsed.candidates?.filter(
    (item) =>
      item?.sentence?.trim().length &&
      item?.sentence_kr?.trim().length &&
      item?.pron_sentence_kr?.trim().length &&
      isValidPronunciationLine(item.sentence_kr, item.pron_sentence_kr),
  );
  if (!parsed.meaning_kr?.trim() || !parsed.pron_word_kr?.trim() || !candidates || candidates.length < 3) {
    return null;
  }

  return {
    meaning_kr: parsed.meaning_kr.trim(),
    pron_word_kr: parsed.pron_word_kr.trim(),
    candidates: candidates.slice(0, 3).map((item) => ({
      sentence: item.sentence.trim(),
      sentence_kr: item.sentence_kr.trim(),
      pron_sentence_kr: item.pron_sentence_kr.trim(),
    })),
  };
}
