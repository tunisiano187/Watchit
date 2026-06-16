import { extractTopicsOllama } from './ollamaExtractor';
import { extractTopicsTfidf } from './tfidfExtractor';

/** Tries Ollama for semantic topic extraction, falls back to TF-IDF on failure. */
export async function extractTopics(text: string): Promise<Record<string, number>> {
  try {
    const topics = await extractTopicsOllama(text);
    if (Object.keys(topics).length > 0) return topics;
  } catch (error) {
    console.warn('Ollama topic extraction failed, falling back to TF-IDF:', error);
  }

  return extractTopicsTfidf(text);
}
