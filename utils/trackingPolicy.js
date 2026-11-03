// A lease uses the server clock's remaining duration, not the phone's clock.
export function trackingContext(token, tracking, now = Date.now()) {
  if (!token || !tracking || !['standby', 'dispatch', 'on_scene'].includes(tracking.mode)) return null;
  const remaining = Math.min(Date.parse(tracking.policy_expires_at), Date.parse(tracking.duty_ends_at)) - Date.parse(tracking.server_time);
  const expiresAt = (tracking.client_received_at ?? now) + Math.min(remaining, 120000);
  if (!Number.isFinite(remaining) || remaining <= 0 || expiresAt <= now) return null;
  return { token, mode: tracking.mode, dispatchId: tracking.dispatch_id ?? null,
    intervalMs: { standby: 30000, dispatch: 3000, on_scene: 20000 }[tracking.mode],
    expiresAt };
}

export function validFix(fix, now = Date.now()) {
  return fix && Number.isFinite(fix.timestamp) && now - fix.timestamp <= 60000 && fix.timestamp <= now + 30000 &&
    Number.isFinite(fix.coords?.latitude) && Number.isFinite(fix.coords?.longitude);
}

export function fixPayload(fix, ctx) {
  return { latitude: fix.coords.latitude, longitude: fix.coords.longitude,
    recorded_at: new Date(fix.timestamp).toISOString(), dispatch_id: ctx.dispatchId,
    accuracy_m: Number.isFinite(fix.coords.accuracy) && fix.coords.accuracy >= 0 ? fix.coords.accuracy : null,
    sample_id: String(fix.timestamp) };
}
