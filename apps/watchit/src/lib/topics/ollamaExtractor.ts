const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'mistral:7b';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 10_000);

const PROMPT = (text: string) => `Extract 5 to 10 specific topic tags from this article.
Tags should range from broad categories (e.g. "sports", "geography") to specific
subjects (e.g. "felines", "cats") when the text supports it.
Respond with ONLY a JSON object mapping each tag to a relevance weight between 0 and 1,
e.g. {"cats": 0.9, "felines": 0.7, "pets": 0.4}. No prose, no markdown fences.

Article:
${text}`;

/** Throws on timeout or any non-2xx response - callers should fall back to TF-IDF. */
export async function extractTopicsOllama(text: string): Promise<Record<string, number>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: PROMPT(text),
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status})`);
    }

    const { response: raw } = await response.json();
    const parsed = JSON.parse(raw);

    const result: Record<string, number> = {};
    for (const [topic, weight] of Object.entries(parsed)) {
      if (typeof weight === 'number') {
        result[topic.toLowerCase()] = Math.max(0, Math.min(1, weight));
      }
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
