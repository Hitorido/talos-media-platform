export type NovelLanguage = 'en' | 'ja' | 'all';
export function providerNovelLanguage(id: string): string | undefined {
  return id === 'narou' ? 'ja' : ['novelcodex', 'novelarrow', 'novelping'].includes(id) ? 'en' : undefined;
}
export function languageLabel(language?: string): string {
  return ({en:'English',ja:'Japanese',zh:'Chinese',ko:'Korean'} as Record<string,string>)[language?.split('-')[0] ?? ''] ?? 'Unknown language';
}
