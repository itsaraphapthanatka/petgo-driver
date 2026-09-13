#!/usr/bin/env node
// Regression net for the session rules the apps rely on but tsc cannot check:
//
//   1. services/httpClient.ts   - every 401 clears the session exactly once (apiFetch)
//   2. utils/apiError.ts        - a 403 driver_not_approved is recognised in both shapes it arrives in
//   3. static tripwires         - api.ts routes every request through apiFetch and imports no store,
//                                 useAuthStore registers the handler, chatSocket sends the token and
//                                 never logs the URL, authService logs no OTP/token, and the shared
//                                 files are byte-identical in both apps.
//
// Run with Node >= 23.6 (type stripping, no build step):
//
//   node --no-warnings scripts/check-session-guards.mjs
//
// Exit code 0 = all checks pass. Both apps carry an identical copy of this script.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');
const OTHER_APP = fs.existsSync(path.join(APP, 'app', '(driver)'))
  ? path.resolve(APP, '..', 'pet-transpot-client')
  : path.resolve(APP, '..', 'petgo-driver');

let pass = 0;
const failures = [];

function check(name, fn) {
  try {
    const problem = fn();
    if (problem) failures.push(`${name}: ${problem}`);
    else pass++;
  } catch (error) {
    failures.push(`${name}: threw ${error?.message ?? error}`);
  }
}

function read(file, app = APP) {
  return fs.readFileSync(path.join(app, file), 'utf8');
}

// ---------------------------------------------------------------- 1. apiFetch
const { apiFetch, setUnauthorizedHandler } = await import(path.join(APP, 'services/httpClient.ts'));

let responses = [];
let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls++;
  return responses.shift() ?? { status: 200 };
};

const res = (status) => ({ status });

await (async () => {
  // 200: the handler must not run
  let calls = 0;
  setUnauthorizedHandler(() => {
    calls++;
  });
  responses = [res(200)];
  let out = await apiFetch('/x');
  check('apiFetch passes a 200 through untouched', () => (out.status === 200 ? null : `status ${out.status}`));
  check('apiFetch does not clear the session on 200', () => (calls === 0 ? null : `${calls} handler calls`));

  // 401: exactly one handler call, response still returned to the caller
  calls = 0;
  responses = [res(401)];
  out = await apiFetch('/x');
  check('apiFetch runs the handler on 401', () => (calls === 1 ? null : `${calls} handler calls`));
  check('apiFetch still returns the 401 to the caller', () => (out.status === 401 ? null : `status ${out.status}`));

  // 403 must not log anyone out (driver_not_approved is not an expired session)
  calls = 0;
  responses = [res(403)];
  await apiFetch('/x');
  check('apiFetch does not clear the session on 403', () => (calls === 0 ? null : `${calls} handler calls`));

  // Several requests in flight share one logout
  calls = 0;
  let resolveHandler;
  setUnauthorizedHandler(
    () =>
      new Promise((resolve) => {
        calls++;
        resolveHandler = resolve;
      })
  );
  responses = [res(401), res(401), res(401)];
  const inFlight = [apiFetch('/a'), apiFetch('/b'), apiFetch('/c')];
  await new Promise((r) => setTimeout(r, 0));
  resolveHandler();
  const settled = await Promise.all(inFlight);
  check('parallel 401s clear the session once', () => (calls === 1 ? null : `${calls} handler calls`));
  check('parallel 401s all resolve', () =>
    settled.every((r) => r.status === 401) ? null : 'a request did not resolve with its own response');

  // A later 401 (new session, expired again) must be handled again
  calls = 0;
  setUnauthorizedHandler(() => {
    calls++;
  });
  responses = [res(401), res(401)];
  await apiFetch('/x');
  await apiFetch('/y');
  check('a 401 after the handler finished is handled again', () => (calls === 2 ? null : `${calls} handler calls`));

  // A handler that throws must not replace the caller's own error handling
  setUnauthorizedHandler(() => {
    throw new Error('storage unavailable');
  });
  responses = [res(401)];
  let threw = null;
  const warn = console.warn;
  console.warn = () => {}; // apiFetch warns about the failing handler on purpose
  try {
    out = await apiFetch('/x');
  } catch (error) {
    threw = error;
  } finally {
    console.warn = warn;
  }
  check('a failing handler does not break the request', () =>
    threw === null && out.status === 401 ? null : `threw ${threw?.message}`);

  // No handler registered (e.g. a service used before the store loaded)
  setUnauthorizedHandler(null);
  responses = [res(401)];
  out = await apiFetch('/x');
  check('apiFetch works without a handler', () => (out.status === 401 ? null : `status ${out.status}`));
  check('every apiFetch call reached fetch', () => (fetchCalls === 10 ? null : `${fetchCalls} fetch calls`));
})();

// ------------------------------------------------- 2. driver_not_approved 403
const { ApiError, isDriverNotApprovedError } = await import(path.join(APP, 'utils/apiError.ts'));

const notApproved = {
  code: 'driver_not_approved',
  registration_status: 'pending',
  message: 'บัญชีของคุณยังไม่ผ่านการอนุมัติ',
};

check('structured 403 detail is recognised', () =>
  isDriverNotApprovedError(new ApiError(403, notApproved.message, 'ctx', notApproved))
    ? null
    : 'not recognised');

check('403 with the code only in the text is recognised', () =>
  isDriverNotApprovedError(new ApiError(403, 'driver_not_approved', 'ctx')) ? null : 'not recognised');

// services/orderService.ts throws `new Error("Failed to accept order: 403 - <raw body>")`
check('raw-body Error from orderService is recognised', () =>
  isDriverNotApprovedError(
    new Error(`Failed to accept order: 403 - ${JSON.stringify({ detail: notApproved })}`)
  )
    ? null
    : 'not recognised');

check('the negative-wallet 403 is NOT treated as not-approved', () =>
  isDriverNotApprovedError(
    new Error('Failed to accept order: 403 - {"detail":"ยอดเงินในกระเป๋าติดลบเกิน 500 บาท"}')
  )
    ? 'wallet 403 misread as driver_not_approved'
    : null);

check('a 401 is not treated as not-approved', () =>
  isDriverNotApprovedError(new ApiError(401, 'Could not validate credentials', 'ctx'))
    ? '401 misread'
    : null);

check('non-errors are safe', () =>
  isDriverNotApprovedError(undefined) || isDriverNotApprovedError('driver_not_approved')
    ? 'non-Error value misread'
    : null);

// -------------------------------------------------------- 3. static tripwires
const api = read('services/api.ts');
check('api.ts routes every request through apiFetch', () => {
  const bare = api.match(/(?<![A-Za-z.])fetch\(/g) ?? [];
  return bare.length === 0 ? null : `${bare.length} bare fetch( call(s) left`;
});
check('api.ts imports apiFetch', () =>
  /import\s*\{\s*apiFetch\s*\}\s*from\s*'\.\/httpClient'/.test(api) ? null : 'import missing');
check('api.ts imports no store (require cycle)', () =>
  /from\s*'\.\.\/store\//.test(api) ? 'api.ts imports a store again' : null);

const store = read('store/useAuthStore.ts');
check('useAuthStore registers the 401 handler', () =>
  /setUnauthorizedHandler\(/.test(store) ? null : 'setUnauthorizedHandler call missing');
check('the 401 handler goes through logout()', () =>
  /setUnauthorizedHandler\([\s\S]{0,400}?logout\(\)/.test(store) ? null : 'handler does not call logout()');

const chat = read('services/chatSocket.ts');
check('chatSocket sends the token in the query', () =>
  /token=\$\{encodeURIComponent\(token\)\}/.test(chat) ? null : 'token query param missing');
check('chatSocket never logs the socket URL', () => {
  const logs = chat.match(/console\.(log|warn|error|info)\([^\n]*/g) ?? [];
  const leaky = logs.filter((line) => /\burl\b/.test(line));
  return leaky.length === 0 ? null : `logs the URL: ${leaky.join(' | ')}`;
});
check('chatSocket has no reconnect loop', () =>
  /setInterval|setTimeout/.test(chat) ? 'timer found - a silent retry loop is not allowed' : null);
check('chatSocket reports auth failures to the caller', () =>
  /onFailure\?\.\('auth'\)/.test(chat) ? null : "no onFailure('auth') path");

const auth = read('services/authService.ts');
check('authService logs no phone/OTP/token', () => {
  const logs = auth.match(/console\.log\([^\n]*/g) ?? [];
  return logs.length === 0 ? null : `${logs.length} console.log left: ${logs.join(' | ')}`;
});

const orderTypes = read('types/order.ts');
check('DriverOut has no nested user any more', () => {
  const block = orderTypes.slice(
    orderTypes.indexOf('export interface DriverOut'),
    orderTypes.indexOf('export interface PetOut')
  );
  return /\buser(_id)?\s*[?:]/.test(block) ? 'DriverOut still declares user / user_id' : null;
});

// No screen may read the removed nested object
for (const app of [APP, OTHER_APP]) {
  check(`no screen reads driver.user in ${path.basename(app)}`, () => {
    const hits = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.git', '.expo', 'android', 'ios'].includes(entry.name)) continue;
          walk(full);
        } else if (/\.tsx?$/.test(entry.name)) {
          const text = fs.readFileSync(full, 'utf8');
          if (/\bdriver\??\.user\b/.test(text)) hits.push(path.relative(app, full));
        }
      }
    };
    for (const dir of ['app', 'components', 'store', 'stores', 'services']) {
      const full = path.join(app, dir);
      if (fs.existsSync(full)) walk(full);
    }
    return hits.length === 0 ? null : `still reads driver.user: ${hits.join(', ')}`;
  });
}

// The two apps share these files by copy, so drift is the failure mode
if (fs.existsSync(OTHER_APP)) {
  for (const shared of [
    'services/httpClient.ts',
    'services/chatSocket.ts',
    'utils/apiError.ts',
    'types/auth.ts',
    'scripts/check-session-guards.mjs',
  ]) {
    check(`${shared} is identical in both apps`, () =>
      read(shared) === read(shared, OTHER_APP) ? null : 'files differ');
  }
} else {
  failures.push(`the other app was not found at ${OTHER_APP}`);
}

const total = pass + failures.length;
if (failures.length) {
  console.error(`\nsession guards: ${pass}/${total}`);
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log(`session guards (401 handler, driver_not_approved, chat token): ${pass}/${total} -> OK`);
