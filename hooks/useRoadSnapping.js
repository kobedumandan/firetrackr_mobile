import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { snapToRoad } from '../constants/api';
import { haversine } from '../utils/geo';

const MATCH_INTERVAL_MS = 1000;
const MATCH_REFRESH_MS = 3000;

// Match independently of the assigned route. Cache only a short road segment;
// the map projects each fresh GPS fix onto it rather than showing an old fix.
export function useRoadSnapping(location, token) {
  const latest = useRef(location);
  latest.current = location;
  const [match, setMatch] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let active = AppState.currentState === 'active';
    let controller = null;
    let lastQuery = null;

    const update = async () => {
      const fix = latest.current;
      if (cancelled || !active || controller || !fix ||
          !Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return;
      const now = Date.now();
      const point = [fix.longitude, fix.latitude];
      if (lastQuery && now - lastQuery.at < MATCH_REFRESH_MS &&
          haversine(point, lastQuery.point) < 3) return;
      lastQuery = { at: now, point };
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 3000);
      try {
        const road = await snapToRoad(token, fix.latitude, fix.longitude, request.signal);
        if (!cancelled && active && !request.signal.aborted) {
          setMatch({ token, road: road ? { ...road, matchedAt: now, queryPoint: point } : null });
        }
      } catch {
        if (!cancelled) setMatch(null);
      } finally {
        clearTimeout(timeout);
        if (controller === request) controller = null;
      }
    };

    update();
    const timer = setInterval(update, MATCH_INTERVAL_MS);
    const sub = AppState.addEventListener('change', value => {
      active = value === 'active';
      lastQuery = null;
      if (!active) { controller?.abort(); setMatch(null); }
      else update();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      controller?.abort();
      sub.remove();
    };
  }, [token]);

  return match?.token === token ? match.road : null;
}
