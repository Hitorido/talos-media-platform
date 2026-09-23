import { create } from 'zustand';
import type { NovelLanguage } from '@/utils/novelLanguage';
export const useNovelPreferencesStore = create<{language: NovelLanguage; setLanguage: (language: NovelLanguage) => void}>((set) => ({
  language: 'en', setLanguage: (language) => set({language}),
}));
