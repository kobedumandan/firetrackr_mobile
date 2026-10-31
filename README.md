## FireOPS Mobile App

### Road snapping and recalculated navigation (2026-10-30)

The Route screen matches the personnel marker to a nearby road on the backend's
routing network, including roads outside the assigned route and when no dispatch
is active. `GET /api/mobile/road-snap?lat=...&lon=...` requires a personnel account
and matches within 60 metres. The map projects fresh fixes onto the returned road
segment between requests; moving matches are requested at most once per second,
stationary matches refresh after three seconds, and matches expire after five.
Matching pauses in the background. Offline, expired, or out-of-network matches
fall back to GPS; only positions within eight metres of the navigation path can
use route following. Original GPS coordinates and accuracy still go to tracking
and deviation detection.

Non-manning personnel follow their own `personnel_route_wkt` when available.
Manning drivers follow the truck's selected route. `dispatch_deviation` and
`dispatch_rerouted` events refresh status so recalculated paths reach the map;
the backend confirms deviation beyond 25 metres using two accepted fixes at most
30 seconds apart, each with accuracy of 25 metres or better, and rejoins within
10 metres. Restart the backend and reload the app to enable the new endpoint
and screen changes. No additional map key or native dependency is required.

Local regression checks use `node --test tests/roadSnapping.test.mjs` (kept local
under the existing test-tooling policy). Physical-phone acceptance still needs
to cover a wrong turn onto a parallel road, an individual personnel reroute,
a manning-driver reroute, and loss/restoration of network connectivity.

### On-duty tracking and response evidence (2026-10-24)

The original mobile source now uses the backend's duty roster and renewable policy
lease: 30-second standby updates, 3-second dispatched/en-route updates, and
20-second on-scene updates. Sharing stops off duty, on logout or when permission or
eligibility expires. Open the app at the start of the next shift to renew duty
eligibility; automatic unattended next-shift wake-up is not guaranteed.

The incident modal includes acknowledge/depart controls for assigned leaders and
drivers and an on-scene team-clearance control for leaders. GPS payloads include
accuracy and stable retry IDs. Native background timing, permission behavior and
battery use still need physical-phone acceptance. See the sibling web checkout's
[implementation/review guide](../firetrackr/documentation/capstone-objectives-implementation.md).

Personal arrival is separate from vehicle arrival: another responder reaching the
incident does not stop the truck. Vehicle arrival requires the assigned driver
to be manning the truck when confirming arrival. The home card uses the signed-in
personnel's own response status.

Local policy/task and API checks (test files are local validation tooling and are
not included in commits under the workspace's commit-writer policy):

```powershell
node --experimental-vm-modules --test tests/tracking.test.mjs tests/dispatchActions.test.mjs
```

This is the Mobile app, or the Personnel Module of FireOPS. Personnel can use the app to:
- Be immediately notified about dispatches from Fire Station Command.
- Be informed about current Dispatch and Fire Incident information, in Real-time.
- Get information about the most efficient route to be taken to the Fire Incident.
- Create Incident Reports after incidents are controlled & contained, allowing faster report generation by personnel on the field.

<br>

<p align="center">
  <b>Tech Stack used:</b>
</p>
<p align="center">
  <a href="https://skillicons.dev"><img src="https://skillicons.dev/icons?i=javascript,react&perline=5" alt="Stack" /></a>
</p>

## Setup

### Backend URL
Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the backend
(usually the ngrok tunnel). Restart with `npx expo start -c` after changing it.

### Dispatch push alerts (one-time)
Push alerts are what reach a responder whose phone is asleep. Until these steps
are done, Settings → Push Notifications shows why it isn't active, and the
backend texts dispatched members over PhilSMS instead (when `SEND_SMS=true`).

1. **Expo project** — `npm i -g eas-cli`, `eas login`, then `eas init` in this
   folder. This writes `extra.eas.projectId` into `app.json`.
2. **Firebase** — create a Firebase project, add an Android app with package
   `com.bfp.firegis`, download `google-services.json` into this folder.
   `app.config.js` picks it up automatically.
3. **FCM key for Expo** — in Firebase → Project settings → Service accounts,
   generate a private key, then `eas credentials` → Android →
   Google Service Account → *FCM V1* and upload that JSON.
4. **Rebuild** — `npx expo prebuild --platform android --no-install`, then
   `npx expo run:android` (native changes don't arrive through a JS reload).
5. On the phone: Settings → **Send Test Alert**.

### Background location
Tracking during a dispatch runs as an Android foreground service (the
"Dispatch in progress" notification), so it continues with the screen off.
It needs location set to **Allow all the time**; the app asks when a dispatch
starts. If refused, tracking falls back to foreground-only. Some phones
(Xiaomi, Oppo, Vivo, Samsung) also need battery optimisation turned off for
FireGIS, or they kill the service anyway.
