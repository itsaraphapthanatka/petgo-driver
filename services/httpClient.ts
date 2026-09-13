/**
 * One place where an expired or rejected session is noticed.
 *
 * Access tokens live for ACCESS_TOKEN_EXPIRE_MINUTES (1440 = 24 h) on the backend. When one expires
 * every protected endpoint answers 401 and, before this module existed, each service turned that into
 * an empty list / a generic "Failed to fetch ..." error, so the user stared at a blank screen instead
 * of being sent back to login. `apiFetch` is a drop-in replacement for `fetch` that calls the
 * registered handler once per 401 and then hands the response back untouched, so callers keep their
 * own error handling (status codes, FastAPI `detail`, ...).
 *
 * The handler is *injected* (`setUnauthorizedHandler`), not imported: services must not import
 * stores, or Metro reports a require cycle. `store/useJobStore` imports `services/orderService`, so
 * `services/* -> store/useAuthStore -> store/useJobStore -> services/orderService` closes a loop as
 * soon as a second service wants the same behaviour. Keeping this module free of app imports means
 * any service can use it. `store/useAuthStore` registers the handler when it is first imported
 * (the root `app/_layout.tsx` imports it before anything can fire a request).
 */

/** Called once per 401 response, e.g. to clear the session. May be async; its result is awaited. */
export type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let handlingUnauthorized: Promise<void> | null = null;

/** Register (or clear, with `null`) the callback that runs when a request answers 401. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
    unauthorizedHandler = handler;
}

/**
 * `fetch` plus the global 401 rule. Screens with several requests in flight share one handler run,
 * so an expired token clears the session once instead of once per request.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, init);

    if (response.status === 401 && unauthorizedHandler) {
        if (!handlingUnauthorized) {
            const handler = unauthorizedHandler;
            handlingUnauthorized = (async () => {
                try {
                    await handler();
                } catch (error) {
                    // Never let session cleanup replace the caller's error with its own
                    console.warn('Unauthorized handler failed:', error);
                }
            })().finally(() => {
                handlingUnauthorized = null;
            });
        }
        await handlingUnauthorized;
    }

    return response;
}
