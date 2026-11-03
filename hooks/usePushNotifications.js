import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import {
  DEFAULT_PUSH_PREFS,
  PushUnavailableError,
  getExpoPushToken,
  readPushPrefs,
  readLastPushToken,
  rememberPushToken,
  registerPushToken,
  savePushPrefs,
  unregisterPushToken,
} from '../utils/notifications';
import { navigateHome } from '../utils/navigation';

/**
 * Keeps this phone registered for dispatch alerts while signed in.
 *
 * Re-registers on every sign-in / app start (the backend treats it as a
 * heartbeat and reassigns a shared phone to whoever signed in last), and
 * whenever the Settings toggles change. `pushState` is what Settings shows:
 *   { state: 'off' | 'registering' | 'on' | 'error', message? }
 *
 * An incoming alert also triggers `onAlert` (a status refresh), so the app is
 * already showing the new dispatch by the time the responder looks at it.
 */
export function usePushNotifications({ token, onAlert }) {
  const [prefs, setPrefsState] = useState(DEFAULT_PUSH_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const prefsRef = useRef(DEFAULT_PUSH_PREFS);
  const [pushState, setPushState] = useState({ state: 'off' });
  const pushTokenRef = useRef(null);
  const operations = useRef(Promise.resolve());
  const [attempt, setAttempt] = useState(0);
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  const enqueue = useCallback((operation) => {
    const next = operations.current.catch(() => {}).then(operation);
    operations.current = next;
    return next;
  }, []);
  const retryPushRegistration = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    readPushPrefs().then((p) => {
      if (!cancelled) { prefsRef.current = p; setPrefsState(p); setPrefsLoaded(true); }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!token || !prefsLoaded) return;
    let cancelled = false;

    setPushState({ state: prefs.enabled ? 'registering' : 'off' });
    enqueue(async () => {
      if (cancelled) return;
      try {
        if (!prefs.enabled) {
          const lastToken = pushTokenRef.current ?? await readLastPushToken();
          if (cancelled) return;
          if (lastToken) await unregisterPushToken(token, lastToken);
          if (!cancelled) setPushState({ state: 'off' });
          return;
        }
        const pushToken = await getExpoPushToken();
        if (cancelled) return;
        pushTokenRef.current = pushToken;
        await rememberPushToken(pushToken);
        if (cancelled) return;
        await registerPushToken(token, pushToken, prefs);
        if (!cancelled) setPushState({ state: 'on' });
      } catch (err) {
        if (cancelled) return;
        setPushState({
          state: 'error',
          message: err instanceof PushUnavailableError
            ? err.message
            : prefs.enabled ? `Could not register for alerts: ${err.message}`
              : 'Could not stop remote alerts. Reconnect and retry notifications.',
        });
      }
    });

    return () => { cancelled = true; };
  }, [token, prefsLoaded, prefs, attempt, enqueue]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && token) retryPushRegistration();
    });
    return () => subscription.remove();
  }, [token, retryPushRegistration]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      onAlertRef.current?.();
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(() => {
      onAlertRef.current?.();
      navigateHome();
    });
    return () => { received.remove(); tapped.remove(); };
  }, []);

  const setPushPrefs = useCallback((patch) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    savePushPrefs(next);
    setPrefsState(next);
  }, []);

  /** Call before revoking the session token, while it can still authenticate. */
  const unregisterForLogout = useCallback(async (authToken) => {
    await enqueue(async () => {
      const lastToken = pushTokenRef.current ?? await readLastPushToken();
      try {
        if (lastToken) await unregisterPushToken(authToken, lastToken);
      } catch { /* Local sign-out must still complete without a connection. */ }
      setPushState({ state: 'off' });
    });
  }, [enqueue]);

  return { pushPrefs: prefs, setPushPrefs, pushState, unregisterForLogout, retryPushRegistration };
}
