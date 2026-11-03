import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import DarkColors from '../constants/colors';
import LightColors from '../constants/lightColors';
import { DEFAULT_APP_PREFERENCES, normalizeAppPreferences, resolveTheme } from '../utils/appPreferences';

const STORAGE_KEY = 'bfp_app_preferences';
const AppPreferencesContext = createContext(null);

export function AppPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULT_APP_PREFERENCES);
  const [ready, setReady] = useState(false);
  const systemTheme = useColorScheme();
  const current = useRef(DEFAULT_APP_PREFERENCES);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved = DEFAULT_APP_PREFERENCES;
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        saved = normalizeAppPreferences(raw ? JSON.parse(raw) : null);
      } catch { /* Use defaults if stored preferences cannot be read. */ }
      if (!cancelled) {
        current.current = saved;
        setPreferences(saved);
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updatePreferences = useCallback((patch) => {
    const next = normalizeAppPreferences({ ...current.current, ...patch });
    current.current = next;
    setPreferences(next);
    // Serialize writes so rapid changes survive restart in the selected order.
    const write = writes.current.catch(() => {}).then(() =>
      SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next))
    );
    writes.current = write;
    return write;
  }, []);

  const resolvedTheme = resolveTheme(preferences.theme, systemTheme);
  const colors = resolvedTheme === 'light' ? LightColors : DarkColors;
  const value = useMemo(() => ({
    ...preferences, colors, resolvedTheme, isDark: resolvedTheme === 'dark',
    updatePreferences,
  }), [preferences, colors, resolvedTheme, updatePreferences]);

  return (
    <AppPreferencesContext.Provider value={value}>
      {ready ? children : (
        <View style={{ flex: 1, backgroundColor: colors.bgBase, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accentFire} />
        </View>
      )}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) throw new Error('App preferences require AppPreferencesProvider.');
  return context;
}

export function createUseStyles(factory) {
  return function useStyles() {
    const { colors } = useAppPreferences();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
