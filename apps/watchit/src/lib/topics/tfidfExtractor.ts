const STOPWORDS = new Set([
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'on', 'for', 'with', 'as', 'by', 'at', 'from', 'this', 'that',
  'it', 'its', 'has', 'have', 'had', 'will', 'would', 'can', 'could', 'about',
  'into', 'than', 'after', 'over', 'new', 'how', 'what', 'why', 'which',
  // French
  'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'est', 'sont', 'pour',
  'dans', 'sur', 'avec', 'par', 'que', 'qui', 'ce', 'cette', 'ces', 'au', 'aux',
]);

/**
 * Lightweight keyword extractor used as a fallback when Ollama is
 * unavailable or too slow. Scores words by normalized frequency within the
 * given text - not true TF-IDF (no corpus-wide IDF), but cheap and
 * dependency-free.
 */
export function extractTopicsTfidf(text: string, maxTopics = 8): Record<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9À-ÿ\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

  if (words.length === 0) return {};

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxTopics);

  return Object.fromEntries(sorted.map(([word, count]) => [word, count / maxCount]));
}
