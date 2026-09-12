const KNOWN_LANGUAGES: Record<string, string> = {
  en: 'English',
  ja: 'Japanese',
  fr: 'French',
  es: 'Spanish',
  'es-la': 'Spanish (Latin America)',
  'pt-br': 'Portuguese (Brazil)',
  pt: 'Portuguese',
  ko: 'Korean',
  zh: 'Chinese',
  'zh-hk': 'Chinese (Hong Kong)',
  'zh-ro': 'Chinese (Romanized)',
  id: 'Indonesian',
  de: 'German',
  it: 'Italian',
  ru: 'Russian',
  vi: 'Vietnamese',
  th: 'Thai',
  ar: 'Arabic',
  tr: 'Turkish',
  pl: 'Polish',
  uk: 'Ukrainian',
  hi: 'Hindi',
  tl: 'Tagalog',
  ms: 'Malay',
};

/**
 * Returns a human-friendly language name for a given BCP47/ISO language code.
 * E.g. 'en' -> 'English', 'fr' -> 'French', 'es-la' -> 'Spanish (Latin America)'
 */
export function getLanguageDisplayName(code?: string): string {
  if (!code) return 'Unknown';
  const normalized = code.toLowerCase().trim();

  if (KNOWN_LANGUAGES[normalized]) {
    return KNOWN_LANGUAGES[normalized];
  }

  try {
    const intlName = new Intl.DisplayNames(['en'], { type: 'language' }).of(normalized);
    if (intlName && intlName !== normalized) {
      return intlName;
    }
  } catch {
    // Intl.DisplayNames fallback
  }

  return normalized.toUpperCase();
}

/**
 * Short badge label for language (e.g. 'EN', 'FR', 'JA', 'ES-LA')
 */
export function getLanguageBadge(code?: string): string {
  if (!code) return '';
  return code.toUpperCase().trim();
}
