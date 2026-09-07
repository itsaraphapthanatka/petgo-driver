#!/usr/bin/env node
// Regression tests for the Google Directions refetch throttle in services/googleDirectionsApi.ts
// and for the two screens that feed it. Pure functions plus static "tripwire" checks on the screen
// source: nothing here touches the network (global fetch is stubbed to throw) and no API key is
// needed. Runs in plain Node — in CI and locally:
//
//   node --no-warnings scripts/check-route-throttle.mjs            # summary per section
//   node --no-warnings scripts/check-route-throttle.mjs --verbose  # every check
//
// Node >= 24 imports the service .ts directly (type stripping is on by default), which is why that
// file must stay free of imports (no react-native). --no-warnings only hides Node's
// MODULE_TYPELESS_PACKAGE_JSON reparse warning (package.json has no "type"); the result does not
// depend on the flag. Exit codes: 0 = all checks pass, 1 = a check failed, 2 = the service could
// not be loaded or no screen was found to check. Both apps carry an identical copy of this script;
// each copy checks whichever screen exists in its own repo (driver app/(driver)/job/[id].tsx,
// customer app/(customer)/booking/confirm.tsx). Whether the two copies of the service are identical
// cannot be checked here (a CI runner sees one repo) — compare them by hand when either changes.
//
// What it protects (code-reviewer findings of 2026-09-07 on the throttle commits 4bdeacc / 7a5e9d5):
//  1. The driver job screen routed from a placeholder origin (pickup - 0.005°) before the first GPS
//     fix; shouldRefetchRoute() recorded it and blocked the real request for 30 s — one wasted billed
//     request and a wrong route on every job open.
//  2. The customer confirm screen routed pickup->pickup while hydrating an order before the driver
//     position arrived; same 30 s block, or forever when the driver is parked (the effect only
//     re-runs when assignedDriver changes).
//  3. Deterministic failures (ZERO_RESULTS, REQUEST_DENIED, MISSING_KEY, ...) were retried every
//     30 s while the poll ran: 120 billed requests/hour for the same answer.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
const rel = (p) => path.relative(ROOT, p);

// No network, ever. The service only calls fetch inside getRoutes(); this makes any accidental call fail loudly.
let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls++;
  throw new Error('check-route-throttle: network access is not allowed in this check');
};

const SERVICE = path.join(ROOT, 'services', 'googleDirectionsApi.ts');
let api;
try {
  api = await import(SERVICE);
} catch (error) {
  console.error(`check-route-throttle: could not load ${rel(SERVICE)} (Node ${process.version}).`);
  console.error('Needs Node >= 24 (built-in TypeScript type stripping) and a service file without imports.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
const {
  distanceMeters, isSameRouteTarget, shouldRefetchRoute, trimRouteToPoint, isPermanentRoutingFailure,
  ROUTE_REFETCH_MIN_MOVE_METERS, ROUTE_REFETCH_MIN_INTERVAL_MS,
} = api;
for (const [name, value] of Object.entries({ distanceMeters, isSameRouteTarget, shouldRefetchRoute, trimRouteToPoint, isPermanentRoutingFailure })) {
  if (typeof value !== 'function') {
    console.error(`check-route-throttle: ${rel(SERVICE)} no longer exports ${name}()`);
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
let failed = 0;
let total = 0;
let sectionName = '';
let sectionPass = 0;
let sectionTotal = 0;
const failures = [];

function section(name) {
  flushSection();
  sectionName = name;
  sectionPass = 0;
  sectionTotal = 0;
}
function flushSection() {
  if (sectionName) console.log(`[${sectionName}] ${sectionPass}/${sectionTotal}`);
}
function check(name, cond, extra = '') {
  total++;
  sectionTotal++;
  if (cond) {
    sectionPass++;
    if (VERBOSE) console.log(`  PASS ${name} ${extra}`.trimEnd());
  } else {
    failed++;
    failures.push(`${sectionName}: ${name}${extra ? ` (${extra})` : ''}`);
    console.log(`  FAIL ${name} ${extra}`.trimEnd());
  }
}

const P = (lat, lng) => ({ latitude: lat, longitude: lng });
const req = (o, d, stops = [], mode = 'car') => ({ origin: o, destination: d, stops, mode });
const A = P(13.7563, 100.5018); // Bangkok sample: pickup
const B = P(13.7367, 100.5231); // dropoff, ~3.1 km away
const STOP = P(13.75, 100.51);
const T0 = 1_000_000; // fake clock; nothing here reads Date.now()
const METERS_PER_DEG_LAT = 111_195;
const moved = (m, from = A) => P(from.latitude + m / METERS_PER_DEG_LAT, from.longitude); // m meters north
const polls = (from, every, until) => { const out = []; for (let t = from; t <= until; t += every) out.push(t); return out; };
const okRecord = (r, at) => ({ request: r, at, failed: false });
const failRecord = (code) => (r, at) => ({ request: r, at, failed: true, failureCode: code });

// Feed an effect timeline through a refetch rule. events: [{ t (ms), origin, target? }]. `record`
// builds what the screen would store in routeRequestRef after sending. Returns the sent requests.
function run(rule, events, record, target = B) {
  let last = null;
  const sent = [];
  for (const e of events) {
    const r = req(e.origin, e.target ?? target);
    if (rule(last, r, T0 + e.t)) {
      last = record(r, T0 + e.t);
      sent.push({ t: e.t, origin: e.origin });
    }
  }
  return sent;
}

// The pre-fix rule (commit 4bdeacc / 7a5e9d5), inlined only to print before/after numbers.
function preFixShouldRefetch(last, next, now) {
  if (!last) return true;
  if (!isSameRouteTarget(last.request, next)) return true;
  if (now - last.at < ROUTE_REFETCH_MIN_INTERVAL_MS) return false;
  if (last.failed) return true;
  return distanceMeters(last.request.origin, next.origin) >= ROUTE_REFETCH_MIN_MOVE_METERS;
}

// ---------------------------------------------------------------------------
section('helper basics');
const d1 = distanceMeters(P(0, 0), P(0, 1));
check('distance: 1 deg lng at equator ~111195 m', Math.abs(d1 - 111195) < 120, d1.toFixed(0));
const d2 = distanceMeters(A, B);
check('distance: Bangkok sample ~3.1 km', d2 > 3000 && d2 < 3300, d2.toFixed(0));
check('distance: same point = 0', distanceMeters(P(1, 1), P(1, 1)) === 0);
check('target: car vs truck = same (both driving)', isSameRouteTarget(req(A, B, [], 'car'), req(A, B, [], 'truck')));
check('target: car vs bicycle = different', !isSameRouteTarget(req(A, B), req(A, B, [], 'bicycle')));
check('target: different destination = different', !isSameRouteTarget(req(A, B), req(A, STOP)));
check('target: stops added = different', !isSameRouteTarget(req(A, B), req(A, B, [STOP])));
check('target: destination jitter 0.5 m = same', isSameRouteTarget(req(A, B), req(A, P(B.latitude + 0.000004, B.longitude))));
check('gate: no previous request -> refetch', shouldRefetchRoute(null, req(A, B), T0));
const okLast = okRecord(req(A, B), T0);
check('gate: same target, 5 s later, moved 500 m -> NO refetch (interval)', !shouldRefetchRoute(okLast, req(moved(500), B), T0 + 5000));
check('gate: same target, 30 s later, moved 10 m -> NO refetch (distance)', !shouldRefetchRoute(okLast, req(moved(10), B), T0 + 30000));
check('gate: same target, 30 s later, moved 60 m -> refetch', shouldRefetchRoute(okLast, req(moved(60), B), T0 + 30000));
check('gate: same target, 5 min later, not moved -> NO refetch (stationary)', !shouldRefetchRoute(okLast, req(A, B), T0 + 300000));
check('gate: destination changed, 1 s later -> refetch', shouldRefetchRoute(okLast, req(A, STOP), T0 + 1000));
check('gate: stops changed, 1 s later -> refetch', shouldRefetchRoute(okLast, req(A, B, [STOP]), T0 + 1000));
const failedNoCode = { request: req(A, B), at: T0, failed: true };
check('gate: failed (no code), 5 s later -> NO refetch (no hammering)', !shouldRefetchRoute(failedNoCode, req(A, B), T0 + 5000));
check('gate: failed (no code), 30 s later, not moved -> retry', shouldRefetchRoute(failedNoCode, req(A, B), T0 + 30000));
const path5 = [P(0, 0), P(0, 0.001), P(0, 0.002), P(0, 0.003), P(0, 0.004)];
const near3 = P(0.00001, 0.00301);
const trimmed = trimRouteToPoint(path5, near3);
check('trim: keeps [point, p3, p4]', trimmed.length === 3 && trimmed[0] === near3 && trimmed[1] === path5[3] && trimmed[2] === path5[4]);
check('trim: empty path -> empty', trimRouteToPoint([], near3).length === 0);
check('trim: point before start keeps whole path + point', trimRouteToPoint(path5, P(0, -0.001)).length === 6);

// ---------------------------------------------------------------------------
section('cost: success path, 1 h of 5 s polls');
function simulateOk(speedKmh, hours = 1, pollMs = 5000) {
  const steps = (hours * 3600 * 1000) / pollMs;
  const perPoll = (speedKmh * 1000 / 3600) * (pollMs / 1000);
  let last = null, n = 0, pos = A;
  for (let i = 0; i < steps; i++) {
    if (i > 0) pos = moved(perPoll, pos);
    const r = req(pos, B);
    if (shouldRefetchRoute(last, r, T0 + i * pollMs)) { n++; last = okRecord(r, T0 + i * pollMs); }
  }
  return n;
}
const cap = 3600 / (ROUTE_REFETCH_MIN_INTERVAL_MS / 1000);
const okStill = simulateOk(0), okCity = simulateOk(15), okFast = simulateOk(30);
console.log(`  requests/hour: unthrottled=720, stationary=${okStill}, 15 km/h=${okCity}, 30 km/h=${okFast} (cap ${cap})`);
check('stationary driver -> 1 request/hour', okStill === 1, String(okStill));
check(`moving driver capped at ${cap}/hour`, okCity <= cap && okFast <= cap, `${okCity}/${okFast}`);

// ---------------------------------------------------------------------------
section('case 1: driver job screen must not route from a placeholder origin');
// Timeline: fetchOrder resolves at 200 ms, first GPS fix at 1000 ms, order poll every 5 s, driver 3 km
// from pickup and stationary (red light). Pre-fix the screen sent pickup - 0.005° at 200 ms.
const PICKUP = A;
const PLACEHOLDER = P(A.latitude - 0.005, A.longitude - 0.005);
const GPS = moved(3000);
const laterPolls = polls(5200, 5000, 60000).map((t) => ({ t, origin: GPS }));
const preFixDriver = run(shouldRefetchRoute, [{ t: 200, origin: PLACEHOLDER }, { t: 1000, origin: GPS }, ...laterPolls], okRecord, PICKUP);
const firstReal = preFixDriver.find((s) => s.origin === GPS);
check(`placeholder is far from pickup (${distanceMeters(PLACEHOLDER, PICKUP).toFixed(0)} m): the helper cannot tell it apart, so the screen must not send it`,
  distanceMeters(PLACEHOLDER, PICKUP) > ROUTE_REFETCH_MIN_MOVE_METERS);
check('pre-fix call pattern: real origin at 1000 ms is blocked by the recorded placeholder', preFixDriver[0]?.origin === PLACEHOLDER && !preFixDriver.some((s) => s.t === 1000), `sent at ${JSON.stringify(preFixDriver.map((s) => s.t))} ms`);
check('pre-fix call pattern: real route only after the 30 s gate, 1 wasted billed request', !!firstReal && firstReal.t >= ROUTE_REFETCH_MIN_INTERVAL_MS && preFixDriver.length >= 2, `first real at ${firstReal?.t} ms`);
const fixedDriver = run(shouldRefetchRoute, [{ t: 1000, origin: GPS }, ...laterPolls], okRecord, PICKUP);
check('fixed call pattern: first request is the real origin at 1000 ms, nothing wasted', fixedDriver.length === 1 && fixedDriver[0].t === 1000 && fixedDriver[0].origin === GPS, `sent at ${JSON.stringify(fixedDriver.map((s) => s.t))} ms`);

// ---------------------------------------------------------------------------
section('case 2: customer confirm screen must not route pickup->pickup while hydrating');
// Timeline: hydrateOrder sets bookingStatus=confirmed at 0 ms with assignedDriver still null; the driver
// position arrives with the 5 s location poll. The route effect re-runs only when assignedDriver changes.
const DRIVER_POS = moved(2000);
const preFixParked = run(shouldRefetchRoute, [{ t: 0, origin: PICKUP }, { t: 5000, origin: DRIVER_POS }], okRecord, PICKUP);
check('pre-fix call pattern, parked driver: pickup->pickup sent, driver->pickup blocked, no later re-run', preFixParked.length === 1 && preFixParked[0].origin === PICKUP, `sent at ${JSON.stringify(preFixParked.map((s) => s.t))} ms`);
const approach = polls(5000, 5000, 60000).map((t, i) => ({ t, origin: moved(2000 - i * 40) }));
const preFixMoving = run(shouldRefetchRoute, [{ t: 0, origin: PICKUP }, ...approach], okRecord, PICKUP);
check('pre-fix call pattern, moving driver: real route delayed to the 30 s gate', !!preFixMoving[1] && preFixMoving[1].t >= ROUTE_REFETCH_MIN_INTERVAL_MS, `second request at ${preFixMoving[1]?.t} ms`);
const fixedParked = run(shouldRefetchRoute, [{ t: 5000, origin: DRIVER_POS }], okRecord, PICKUP);
check('fixed call pattern: first request is driver->pickup at 5 s', fixedParked.length === 1 && fixedParked[0].origin === DRIVER_POS);

// ---------------------------------------------------------------------------
section('case 3: deterministic failures are not retried until the target changes');
const PERMANENT = ['ZERO_RESULTS', 'NOT_FOUND', 'REQUEST_DENIED', 'INVALID_REQUEST', 'MAX_WAYPOINTS_EXCEEDED', 'MAX_ROUTE_LENGTH_EXCEEDED', 'MISSING_KEY'];
const TRANSIENT = ['OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT', 'UNKNOWN_ERROR', 'HTTP_ERROR', 'NETWORK', 'PARSE_ERROR', undefined];
check('isPermanentRoutingFailure: permanent set', PERMANENT.every((c) => isPermanentRoutingFailure(c)));
check('isPermanentRoutingFailure: transient set and undefined are retryable', TRANSIENT.every((c) => !isPermanentRoutingFailure(c)));
for (const code of PERMANENT) {
  const last = failRecord(code)(req(A, B), T0);
  check(`${code}: 30 s later, same target, not moved -> NO refetch`, !shouldRefetchRoute(last, req(A, B), T0 + 30000));
  check(`${code}: 5 min later, moved 60 m, same target -> NO refetch`, !shouldRefetchRoute(last, req(moved(60), B), T0 + 300000));
  check(`${code}: destination changed -> refetch`, shouldRefetchRoute(last, req(A, STOP), T0 + 1000));
  check(`${code}: stops changed -> refetch`, shouldRefetchRoute(last, req(A, B, [STOP]), T0 + 1000));
}
for (const code of TRANSIENT) {
  const last = failRecord(code)(req(A, B), T0);
  check(`${code ?? 'non-RoutingError'}: 5 s later -> NO refetch; 30 s later -> retry`, !shouldRefetchRoute(last, req(A, B), T0 + 5000) && shouldRefetchRoute(last, req(A, B), T0 + 30000));
}
function simulateFailing(rule, speedKmh, code, hours = 1, pollMs = 5000) {
  const steps = (hours * 3600 * 1000) / pollMs;
  const perPoll = (speedKmh * 1000 / 3600) * (pollMs / 1000);
  let last = null, n = 0, pos = A;
  for (let i = 0; i < steps; i++) {
    if (i > 0) pos = moved(perPoll, pos);
    const r = req(pos, B);
    if (rule(last, r, T0 + i * pollMs)) { n++; last = failRecord(code)(r, T0 + i * pollMs); }
  }
  return n;
}
const zBefore = [simulateFailing(preFixShouldRefetch, 0, 'ZERO_RESULTS'), simulateFailing(preFixShouldRefetch, 30, 'ZERO_RESULTS')];
const zAfter = [simulateFailing(shouldRefetchRoute, 0, 'ZERO_RESULTS'), simulateFailing(shouldRefetchRoute, 30, 'ZERO_RESULTS')];
console.log(`  ZERO_RESULTS for 1 h of 5 s polls (stationary/30 km/h): pre-fix ${zBefore.join('/')}, now ${zAfter.join('/')} billed requests`);
check(`ZERO_RESULTS pre-fix = ${cap}/hour (billed)`, zBefore.every((n) => n === cap));
check('ZERO_RESULTS now = 1 request per target', zAfter.every((n) => n === 1));
const netAfter = simulateFailing(shouldRefetchRoute, 30, 'NETWORK');
check(`NETWORK (transient) still retried every 30 s = ${cap}/hour`, netAfter === cap, String(netAfter));

// ---------------------------------------------------------------------------
// Static tripwires on the screen source. The effects cannot run in Node, so these pin the exact
// lines that fixed cases 1 and 2. If a change here is intentional, update this script in BOTH apps.
section('tripwires: screen source');
const DRIVER_SCREEN = path.join(ROOT, 'app', '(driver)', 'job', '[id].tsx');
const CUSTOMER_SCREEN = path.join(ROOT, 'app', '(customer)', 'booking', 'confirm.tsx');
let screensChecked = 0;
const FAILURE_CODE_LINE = /failed: true,\s*failureCode: isRoutingError\(error\) \? error\.code : undefined/;
const THROTTLE_CALL = /if \(!shouldRefetchRoute\(routeRequestRef\.current, request\)\) return;/;

if (fs.existsSync(DRIVER_SCREEN)) {
  screensChecked++;
  const src = fs.readFileSync(DRIVER_SCREEN, 'utf8');
  const f = rel(DRIVER_SCREEN);
  check(`${f}: placeholder origin "pickup_lat - 0.005" must not come back`, !/pickup_lat\s*-\s*0\.005/.test(src));
  check(`${f}: route effect returns until currentLocation exists ("if (!order || !currentLocation) return;")`, /if \(!order \|\| !currentLocation\) return;/.test(src));
  check(`${f}: no pickup fallback origin ("origin = { latitude: order.pickup_lat")`, !/origin = \{\s*latitude: order\.pickup_lat/.test(src));
  check(`${f}: every request goes through shouldRefetchRoute()`, THROTTLE_CALL.test(src));
  check(`${f}: failures are recorded with failureCode`, FAILURE_CODE_LINE.test(src));
}
if (fs.existsSync(CUSTOMER_SCREEN)) {
  screensChecked++;
  const src = fs.readFileSync(CUSTOMER_SCREEN, 'utf8');
  const f = rel(CUSTOMER_SCREEN);
  check(`${f}: routeOrigin is null while confirmed without assignedDriver`,
    /const routeOrigin = bookingStatus === 'confirmed'\s*\?\s*\(assignedDriver\s*\?\s*\{\s*latitude: assignedDriver\.lat,\s*longitude: assignedDriver\.lng\s*\}\s*:\s*null\)/.test(src));
  check(`${f}: old pickup fallback origin ("(bookingStatus === 'confirmed' && assignedDriver) ? ... : pickup") must not come back`,
    !/const routeOrigin = \(bookingStatus === 'confirmed' && assignedDriver\)/.test(src));
  check(`${f}: every request goes through shouldRefetchRoute()`, THROTTLE_CALL.test(src));
  check(`${f}: failures are recorded with failureCode`, FAILURE_CODE_LINE.test(src));
}
flushSection();
if (screensChecked === 0) {
  console.error(`check-route-throttle: found neither ${rel(DRIVER_SCREEN)} nor ${rel(CUSTOMER_SCREEN)}; update the paths in this script.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
if (fetchCalls > 0) {
  failed++;
  failures.push(`network: fetch was called ${fetchCalls} time(s); this check must stay offline`);
}
if (failed) {
  console.error(`\n${failed} of ${total} route-throttle check(s) FAILED:`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error('If the change is intentional, update scripts/check-route-throttle.mjs in BOTH apps.');
}
console.log(`route throttle (${rel(SERVICE)} + ${screensChecked} screen): ${total - failed}/${total} -> ${failed ? 'FAIL' : 'OK'}`);
process.exit(failed ? 1 : 0);
