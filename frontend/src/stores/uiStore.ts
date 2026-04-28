import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { SupportedLocale } from '../i18n';

export type ThemeName = 'light' | 'dark' | 'neon';

const STORAGE_THEME_KEY = 'ui.theme';
const STORAGE_LOCALE_KEY = 'ui.locale';

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeName>('dark');
  const locale = ref<SupportedLocale>('zh-CN');

  const init = () => {
    const savedTheme = globalThis.localStorage?.getItem(STORAGE_THEME_KEY) as ThemeName | null;
    const savedLocale = globalThis.localStorage?.getItem(
      STORAGE_LOCALE_KEY
    ) as SupportedLocale | null;

    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'neon')
      theme.value = savedTheme;
    if (savedLocale === 'zh-CN' || savedLocale === 'en') locale.value = savedLocale;

    applyTheme(theme.value);
  };

  const setTheme = (next: ThemeName) => {
    theme.value = next;
  };

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };

  const setLocale = (next: SupportedLocale) => {
    locale.value = next;
  };

  const isDark = computed(() => theme.value === 'dark' || theme.value === 'neon');

  watch(theme, (t) => {
    globalThis.localStorage?.setItem(STORAGE_THEME_KEY, t);
    applyTheme(t);
  });

  watch(locale, (l) => {
    globalThis.localStorage?.setItem(STORAGE_LOCALE_KEY, l);
  });

  return {
    theme,
    locale,
    isDark,
    init,
    setTheme,
    toggleTheme,
    setLocale,
  };
});
