import { francAll } from 'franc-min';

// franc returns ISO 639-3 codes; we store ISO 639-1 in the DB since that's
// what the UI locale picker and content-language filters use.
const ISO_639_3_TO_1: Record<string, string> = {
  eng: 'en',
  fra: 'fr',
  spa: 'es',
  deu: 'de',
  ita: 'it',
  por: 'pt',
  nld: 'nl',
  rus: 'ru',
  jpn: 'ja',
  cmn: 'zh',
  ara: 'ar',
  kor: 'ko',
};

/** Returns an ISO 639-1 code, or null if the language couldn't be reliably detected. */
export function detectLanguage(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 10) return null;

  const [topGuess] = francAll(trimmed, { minLength: 10 });
  if (!topGuess || topGuess[0] === 'und') return null;

  return ISO_639_3_TO_1[topGuess[0]] ?? null;
}
