/**
 * Client for Vane (formerly known as Perplexica), used here purely as an
 * internal search API - https://github.com/ItzCrazyKns/Perplexica.
 *
 * chatModel/embeddingModel reference a provider configured inside Vane's own
 * UI (Settings > Providers). Run `GET /api/providers` against your Vane
 * instance to find the providerId + model key to put in VANE_CHAT_PROVIDER_ID
 * / VANE_CHAT_MODEL_KEY / VANE_EMBEDDING_PROVIDER_ID / VANE_EMBEDDING_MODEL_KEY.
 */

export interface VaneSource {
  content: string;
  metadata: {
    title: string;
    url: string;
    publishedDate?: string;
  };
}

export interface VaneSearchResult {
  message: string;
  sources: VaneSource[];
}

const VANE_URL = process.env.VANE_URL ?? 'http://localhost:3000';

export async function searchVane(query: string): Promise<VaneSearchResult> {
  const response = await fetch(`${VANE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatModel: {
        providerId: process.env.VANE_CHAT_PROVIDER_ID,
        key: process.env.VANE_CHAT_MODEL_KEY,
      },
      embeddingModel: {
        providerId: process.env.VANE_EMBEDDING_PROVIDER_ID,
        key: process.env.VANE_EMBEDDING_MODEL_KEY,
      },
      sources: ['web'],
      query,
      optimizationMode: 'balanced',
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Vane search failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}
