import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL, authHeaders } from '../constants/api';
import { trackingContext, validFix, fixPayload } from '../utils/trackingPolicy';

export const LOCATION_TASK = 'bfp-dispatch-location';
const CONTEXT_KEY = 'bfp_tracking';
let context = null;
let loaded = false;
let generation = 0;
let nativeOwner = false;
let nativeInterval = null;
let queue = Promise.resolve();
let expiryTimer;
let inFlight = false;
let lastSentAt = 0;
let lastSample = null;
const listeners = new Set();
const emit = value => listeners.forEach(fn => { try { fn(value); } catch { /* isolated subscriber */ } });
const serialize = fn => { const work = queue.then(fn); queue = work.catch(() => {}); return work; };
export function onTrackingResult(fn) { listeners.add(fn); return () => listeners.delete(fn); }

async function loadContext() {
  if (!loaded) {
    const version = generation;
    const raw = await SecureStore.getItemAsync(CONTEXT_KEY).catch(() => null);
    if (version === generation) {
      try { context = raw ? JSON.parse(raw) : null; } catch { context = null; }
      loaded = true;
      nativeOwner = Boolean(context?.nativeOwner);
    }
  }
  return context;
}

export async function isBackgroundTrackingRunning() {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
}

// Invalidate immediately, even if native startup or a network reply is pending.
export function stopBackgroundTracking() {
  generation += 1;
  context = null;
  loaded = true;
  nativeOwner = false;
  nativeInterval = null;
  lastSentAt = 0;
  lastSample = null;
  clearTimeout(expiryTimer);
  emit({ sharing: false, reason: 'stopped' });
  return serialize(async () => {
    await SecureStore.deleteItemAsync(CONTEXT_KEY);
    if (await isBackgroundTrackingRunning()) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  });
}

export function configureTracking(token, tracking, background = false) {
  const next = trackingContext(token, tracking);
  if (!next) return stopBackgroundTracking();
  if (context?.token !== token || context?.dispatchId !== next.dispatchId || context?.mode !== next.mode) {
    generation += 1;
    lastSentAt = 0;
    lastSample = null;
  }
  context = { ...next, nativeOwner: background };
  loaded = true;
  nativeOwner = background;
  const version = generation;
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    if (version === generation && context?.expiresAt === next.expiresAt) {
      stopBackgroundTracking().catch(() => {});
      emit({ sharing: false, reason: 'eligibility_expired' });
    }
  }, Math.max(0, next.expiresAt - Date.now()));
  return serialize(async () => {
    if (version !== generation || !context) return;
    await SecureStore.setItemAsync(CONTEXT_KEY, JSON.stringify(context));
    const running = await isBackgroundTrackingRunning();
    if (!background) {
      if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      nativeInterval = null;
      return;
    }
    if (running && nativeInterval === next.intervalMs) return;
    if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    if (version !== generation || !context) return;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: next.mode === 'standby' ? Location.Accuracy.Balanced : Location.Accuracy.High,
      timeInterval: next.intervalMs, distanceInterval: 0, pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation, showsBackgroundLocationIndicator: true,
      foregroundService: { notificationTitle: 'FireTrackr · On-duty location sharing',
        notificationBody: 'Sharing your location with the command center while on duty.',
        notificationColor: '#ff4d1a', killServiceOnDestroy: false },
    });
    nativeInterval = next.intervalMs;
    if (version !== generation) { await Location.stopLocationUpdatesAsync(LOCATION_TASK); nativeInterval = null; }
  });
}

export async function sendTrackingFix(fix, background = false) {
  const ctx = await loadContext();
  if (!ctx || !Number.isFinite(ctx.expiresAt) || Date.now() >= ctx.expiresAt) { await stopBackgroundTracking(); return; }
  if (background !== nativeOwner || inFlight || !validFix(fix) || lastSample === fix.timestamp || Date.now() - lastSentAt < ctx.intervalMs - 300) return;
  const version = generation;
  inFlight = true;
  lastSentAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${BASE_URL}/api/location/update`, {
      method: 'POST', headers: authHeaders(ctx.token), body: JSON.stringify(fixPayload(fix, ctx)), signal: controller.signal,
    });
    if (version !== generation) return;
    if (response.status === 401 || response.status === 403) {
      await stopBackgroundTracking(); emit({ sharing: false, reason: 'session_or_assignment_rejected' }); return;
    }
    if (!response.ok) throw new Error('Location update failed');
    const body = await response.json();
    if (version !== generation) return;
    // Renew and reconcile completion without depending on a mounted React tree.
    if (body.tracking) await configureTracking(ctx.token, { ...body.tracking, client_received_at: Date.now() }, background);
    else if (body.status === 'dispatch_ended') { await stopBackgroundTracking(); return; }
    if (!context) return;
    if (['ok', 'duplicate'].includes(body.status)) lastSample = fix.timestamp;
    emit({ sharing: true, mode: context.mode, lastSentAt: ['ok', 'duplicate'].includes(body.status) ? Date.now() : null,
      isDeviated: Boolean(body.deviation && body.connector_geojson), connectorGeoJSON: body.connector_geojson ?? null });
  } catch {
    if (version === generation) emit({ sharing: false, reason: 'reconnecting' });
  } finally { clearTimeout(timeout); inFlight = false; }
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  try {
    if (error) { await stopBackgroundTracking(); emit({ sharing: false, reason: 'location_unavailable' }); return; }
    const fix = data?.locations?.[data.locations.length - 1];
    if (fix) await sendTrackingFix(fix, true);
  } catch { await stopBackgroundTracking().catch(() => {}); }
});
