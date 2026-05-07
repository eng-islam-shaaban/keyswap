// Bidirectional Arabic ↔ English keyboard layout mapping
// Supports both PC (Windows) and Mac (macOS default) Arabic layouts

export type LayoutType = 'mac' | 'pc';

// ── PC Arabic layout (Windows standard) ─────────────────────────

const PC_LAYOUT_PAIRS: [string, string][] = [
  // Number row
  ['`', 'ذ'],
  ['1', '١'], ['2', '٢'], ['3', '٣'], ['4', '٤'], ['5', '٥'],
  ['6', '٦'], ['7', '٧'], ['8', '٨'], ['9', '٩'], ['0', '٠'],

  // Number row shifted
  ['~', 'ّ'],

  // QWERTY row
  ['q', 'ض'], ['w', 'ص'], ['e', 'ث'], ['r', 'ق'], ['t', 'ف'],
  ['y', 'غ'], ['u', 'ع'], ['i', 'ه'], ['o', 'خ'], ['p', 'ح'],
  ['[', 'ج'], [']', 'د'],

  // QWERTY row shifted
  ['Q', 'َ'], ['W', 'ً'], ['E', 'ُ'], ['R', 'ٌ'], ['T', 'لإ'],
  ['Y', 'إ'], ['U', '\''], ['I', '÷'], ['O', '×'], ['P', '؛'],
  ['{', '<'], ['}', '>'],

  // ASDF row
  ['a', 'ش'], ['s', 'س'], ['d', 'ي'], ['f', 'ب'], ['g', 'ل'],
  ['h', 'ا'], ['j', 'ت'], ['k', 'ن'], ['l', 'م'], [';', 'ك'],
  ['\'', 'ط'],

  // ASDF row shifted
  ['A', 'ِ'], ['S', 'ٍ'], ['D', ']'], ['F', '['], ['G', 'لأ'],
  ['H', 'أ'], ['J', 'ـ'], ['K', '،'], ['L', '/'],

  // ZXCV row
  ['z', 'ئ'], ['x', 'ء'], ['c', 'ؤ'], ['v', 'ر'], ['b', 'لا'],
  ['n', 'ى'], ['m', 'ة'], [',', 'و'], ['.', 'ز'], ['/', 'ظ'],

  // ZXCV row shifted
  ['Z', '~'], ['X', 'ْ'], ['C', '}'], ['V', '{'], ['B', 'لآ'],
  ['N', 'آ'], ['M', '\''], ['<', ','], ['>', '.'], ['?', '؟'],
];

// ── Mac Arabic layout (macOS default) ───────────────────────────

const MAC_LAYOUT_PAIRS: [string, string][] = [
  // Number row
  ['`', '§'],
  ['1', '١'], ['2', '٢'], ['3', '٣'], ['4', '٤'], ['5', '٥'],
  ['6', '٦'], ['7', '٧'], ['8', '٨'], ['9', '٩'], ['0', '٠'],

  // Number row shifted
  ['~', '±'],

  // QWERTY row
  ['q', 'ض'], ['w', 'ص'], ['e', 'ث'], ['r', 'ق'], ['t', 'ف'],
  ['y', 'غ'], ['u', 'ع'], ['i', 'ه'], ['o', 'خ'], ['p', 'ح'],
  ['[', 'ج'], [']', 'ة'],

  // QWERTY row shifted
  ['Q', 'َ'], ['W', 'ً'], ['E', 'ِ'], ['R', 'ٍ'], ['T', 'ُ'],
  ['Y', 'ٌ'], ['U', 'ْ'], ['I', 'ّ'], ['O', '['], ['P', ']'],
  ['{', '<'], ['}', '>'],

  // ASDF row
  ['a', 'ش'], ['s', 'س'], ['d', 'ي'], ['f', 'ب'], ['g', 'ل'],
  ['h', 'ا'], ['j', 'ت'], ['k', 'ن'], ['l', 'م'], [';', 'ك'],
  ['\'', '؛'],

  // ASDF row shifted
  ['A', '«'], ['S', '»'], ['D', 'ى'], ['G', 'لأ'],
  ['H', 'أ'],

  // ZXCV row
  ['z', 'ظ'], ['x', 'ط'], ['c', 'ذ'], ['v', 'د'], ['b', 'ز'],
  ['n', 'ر'], ['m', 'و'], [',', '،'], ['.', '.'], ['/', '/'],

  // ZXCV row shifted
  ['C', 'ئ'], ['V', 'ء'], ['B', 'أ'],
  ['N', 'إ'], ['M', 'ؤ'], ['<', ','], ['>', '.'], ['?', '؟'],
];

// ── Build maps ──────────────────────────────────────────────────

export interface LayoutMaps {
  enToAr: Map<string, string>;
  arToEn: Map<string, string>;
}

export function buildMaps(layout: LayoutType): LayoutMaps {
  const pairs = layout === 'mac' ? MAC_LAYOUT_PAIRS : PC_LAYOUT_PAIRS;
  const enToAr = new Map<string, string>();
  const arToEn = new Map<string, string>();

  for (const [en, ar] of pairs) {
    enToAr.set(en, ar);
    arToEn.set(ar, en);
  }

  // Common punctuation shared between Arabic and English should never be converted.
  // Shifted pairs like ['>', '.'] overwrite normal mappings causing '.' → '>' etc.
  const PRESERVE_CHARS = ['.', ',', '!', '?', '(', ')', '-', ':', '"', "'", ' ', '\n'];
  for (const ch of PRESERVE_CHARS) {
    arToEn.set(ch, ch);
  }

  return { enToAr, arToEn };
}

export function detectPlatformLayout(): LayoutType {
  return navigator.platform.toUpperCase().includes('MAC') ? 'mac' : 'pc';
}
