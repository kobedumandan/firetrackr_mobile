import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { configureTracking, stopBackgroundTracking, sendTrackingFix, onTrackingResult } from '../tasks/locationTask';
import { trackingContext } from '../utils/trackingPolicy';

export function useLocationTracking({ token, tracking, onDeviationChange }) {
  const [state, setState] = useState({ sharing: false, reason: 'checking_duty' });
  const latest = useRef(tracking);
  latest.current = tracking;
  const owner = useRef(false);
  const restart = useRef(null);
  const bgAsked = useRef(false);
  const mode = tracking?.mode ?? 'off';
  const dispatchId = tracking?.dispatch_id ?? null;
  useEffect(() => onTrackingResult(result => {
    setState(prev => ({ ...prev, ...result, lastSentAt: result.lastSentAt ?? prev.lastSentAt }));
    onDeviationChange?.(result.sharing ? result : null);
  }), [onDeviationChange]);
  useEffect(() => {
    if (token && trackingContext(token, tracking)) configureTracking(token, tracking, owner.current)
      .then(() => restart.current?.()).catch(() => { owner.current = false; restart.current?.(); });
    else {
      stopBackgroundTracking().catch(() => {});
      setState({ sharing: false, reason: tracking?.reason || 'off_duty' });
    }
  }, [token, tracking]);

  useEffect(() => {
    let canceled = false;
    let watch;
    let starting = false;
    let foregroundTimer;
    owner.current = false;
    const stopWatch = () => { watch?.remove(); watch = null; clearInterval(foregroundTimer); };
    const start = async () => {
      if (starting || canceled || watch || owner.current || !trackingContext(token, latest.current)) return;
      starting = true;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (canceled) return;
        if (permission.status !== 'granted') {
          await stopBackgroundTracking(); setState({ sharing: false, reason: 'permission_denied' }); return;
        }
        let bg = await Location.getBackgroundPermissionsAsync();
        if (!canceled && bg.status !== 'granted' && bg.canAskAgain && !bgAsked.current) {
          bgAsked.current = true; bg = await Location.requestBackgroundPermissionsAsync();
        }
        if (canceled || !trackingContext(token, latest.current)) return;
        if (bg.status === 'granted') {
          try {
            owner.current = true;
            await configureTracking(token, latest.current, true);
            if (canceled) return;
            stopWatch(); return;
          } catch { owner.current = false; }
        }
        await configureTracking(token, latest.current, false);
        if (canceled || watch) return;
        let fix = null;
        const localWatch = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced,
          timeInterval: mode === 'dispatch' ? 3000 : 10000, distanceInterval: 0 }, value => { fix = value; });
        if (canceled) { localWatch.remove(); return; }
        watch = localWatch;
        const tick = () => {
          if (canceled || AppState.currentState !== 'active') return;
          if (!trackingContext(token, latest.current)) { stopWatch(); return; }
          if (fix) sendTrackingFix(fix).catch(() => {});
        };
        foregroundTimer = setInterval(tick, 1000); tick();
      } catch { if (!canceled) setState({ sharing: false, reason: 'location_unavailable' }); }
      finally { starting = false; }
    };
    restart.current = start;
    start();
    const sub = AppState.addEventListener('change', value => {
      if (value === 'active') { stopWatch(); start(); }
      else if (!owner.current) stopWatch();
    });
    return () => { canceled = true; restart.current = null; stopWatch(); sub.remove(); stopBackgroundTracking().catch(() => {}); };
  }, [token, mode, dispatchId]);
  return state;
}
