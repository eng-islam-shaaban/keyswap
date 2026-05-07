import type { LayoutMaps } from '../mapping/charMap';

type Language = 'arabic' | 'english' | 'unknown';

function detectLanguage(text: string): Language {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
  const latinRegex = /[a-zA-Z]/g;

  const arabicCount = (text.match(arabicRegex) || []).length;
  const latinCount = (text.match(latinRegex) || []).length;

  if (arabicCount === 0 && latinCount === 0) return 'unknown';
  return arabicCount > latinCount ? 'arabic' : 'english';
}

export function convert(text: string, maps: LayoutMaps): string {
  const lang = detectLanguage(text);
  if (lang === 'unknown') return text;

  const map = lang === 'arabic' ? maps.arToEn : maps.enToAr;

  let result = '';
  for (let i = 0; i < text.length; i++) {
    // Check 2-char sequence first (for ligatures like لا → b)
    if (i + 1 < text.length) {
      const twoChar = text[i] + text[i + 1];
      if (map.has(twoChar)) {
        result += map.get(twoChar)!;
        i++;
        continue;
      }
    }

    const char = text[i];
    result += map.get(char) ?? char;
  }

  return result;
}
