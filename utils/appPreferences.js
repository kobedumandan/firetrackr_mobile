export const DEFAULT_APP_PREFERENCES = { theme: 'dark' };
export const THEME_OPTIONS = ['dark', 'light', 'system'];

export function normalizeAppPreferences(value) {
  return {
    theme: THEME_OPTIONS.includes(value?.theme) ? value.theme : 'dark',
  };
}

export function resolveTheme(theme, systemTheme) {
  return theme === 'system' ? (systemTheme === 'light' ? 'light' : 'dark') : theme;
}
