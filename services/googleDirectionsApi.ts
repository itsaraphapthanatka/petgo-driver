/**
 * Google Directions API client: route geometry, distance and duration.
 *
 * Replaces services/hereMapApi.ts. The HERE key has no Routing v8 permission
 * (403 "credentials do not authorize access to perform gemini_route action"),
 * while EXPO_PUBLIC_GOOGLE_MAPS_API_KEY already has the Directions API enabled
 * and the apps render Google Maps anyway.
 *
 * Contract
 *  - Every call returns at least one route or throws a RoutingError. Nothing is
 *    swallowed into an empty array, so "no route exists" (ZERO_RESULTS) and
 *    "the API call failed" (REQUEST_DENIED, NETWORK, ...) stay distinguishable.
 *  - Google answers HTTP 200 for REQUEST_DENIED and ZERO_RESULTS; only the
 *    `status` field in the body is authoritative.
 *  - The request URL carries the API key and is never logged or put in messages.
 */

const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_ROUTE_COLOR = '#4285F4';

export interface LatLng {
    latitude: number;
    longitude: number;
}

export interface DirectionsSegment {
    coordinates: LatLng[];
    color: string;
}

export interface DirectionsRoute {
    /** Road geometry from the first to the last snapped point. */
    coordinates: LatLng[];
    /**
     * Drawable segments. Directions API has no per-span traffic speeds (HERE's
     * spans=dynamicSpeedInfo), so this is one segment in DEFAULT_ROUTE_COLOR
     * that also connects the origin/destination pins to the snapped road.
     */
    segments: DirectionsSegment[];
    /** Meters, summed over all legs. */
    distance: number;
    /** Seconds, summed over all legs (duration_in_traffic when Google provides it). */
    duration: number;
    summary: string;
}

/** Kept from the HERE signature; Google Directions only distinguishes driving vs bicycling. */
export type TransportMode = 'car' | 'truck' | 'scooter' | 'bicycle';

export type RoutingErrorCode =
    // Google `status` values
    | 'ZERO_RESULTS'
    | 'NOT_FOUND'
    | 'REQUEST_DENIED'
    | 'OVER_QUERY_LIMIT'
    | 'OVER_DAILY_LIMIT'
    | 'INVALID_REQUEST'
    | 'MAX_WAYPOINTS_EXCEEDED'
    | 'MAX_ROUTE_LENGTH_EXCEEDED'
    | 'UNKNOWN_ERROR'
    // client-side
    | 'MISSING_KEY'
    | 'HTTP_ERROR'
    | 'NETWORK'
    | 'PARSE_ERROR';

const GOOGLE_STATUS_CODES: readonly string[] = [
    'ZERO_RESULTS',
    'NOT_FOUND',
    'REQUEST_DENIED',
    'OVER_QUERY_LIMIT',
    'OVER_DAILY_LIMIT',
    'INVALID_REQUEST',
    'MAX_WAYPOINTS_EXCEEDED',
    'MAX_ROUTE_LENGTH_EXCEEDED',
    'UNKNOWN_ERROR',
];

export class RoutingError extends Error {
    readonly code: RoutingErrorCode;
    readonly httpStatus?: number;

    constructor(code: RoutingErrorCode, message: string, httpStatus?: number) {
        super(message);
        // Keep the prototype chain intact when classes are transpiled, so instanceof works
        Object.setPrototypeOf(this, RoutingError.prototype);
        this.name = 'RoutingError';
        this.code = code;
        this.httpStatus = httpStatus;
    }

    /** True when Google searched and found no route (not an API failure). */
    get isNoRoute(): boolean {
        return this.code === 'ZERO_RESULTS' || this.code === 'NOT_FOUND';
    }
}

export function isRoutingError(error: unknown): error is RoutingError {
    if (error instanceof RoutingError) return true;
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as { name?: unknown }).name === 'RoutingError' &&
        typeof (error as { code?: unknown }).code === 'string'
    );
}

/** Decode Google's encoded polyline format (precision 1e-5). */
export function decodePolyline(encoded: string): LatLng[] {
    const points: LatLng[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let byte = 0;
        let shift = 0;
        let result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += result & 1 ? ~(result >> 1) : result >> 1;

        shift = 0;
        result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += result & 1 ? ~(result >> 1) : result >> 1;

        points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return points;
}

const isFinitePoint = (p: LatLng | null | undefined): p is LatLng =>
    !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude);

const samePoint = (a: LatLng, b: LatLng) => a.latitude === b.latitude && a.longitude === b.longitude;

const toParam = (p: LatLng) => `${p.latitude},${p.longitude}`;

const toGoogleMode = (mode: TransportMode): 'driving' | 'bicycling' => (mode === 'bicycle' ? 'bicycling' : 'driving');

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Append a path, dropping the shared point where step N ends and step N+1 starts. */
function appendPath(base: LatLng[], next: LatLng[]): LatLng[] {
    if (next.length === 0) return base;
    if (base.length === 0) return next;
    const skip = samePoint(base[base.length - 1], next[0]) ? 1 : 0;
    return base.concat(next.slice(skip));
}

/** Straight connectors from the pins to the snapped road, as the HERE version drew. */
function connectPins(origin: LatLng, road: LatLng[], destination: LatLng): LatLng[] {
    const out = road.slice();
    if (isFinitePoint(origin) && !samePoint(origin, out[0])) out.unshift(origin);
    if (isFinitePoint(destination) && !samePoint(destination, out[out.length - 1])) out.push(destination);
    return out;
}

function buildUrl(
    origin: LatLng,
    destination: LatLng,
    stops: LatLng[],
    mode: TransportMode,
    alternatives: boolean
): string {
    const params: Array<[string, string]> = [
        ['origin', toParam(origin)],
        ['destination', toParam(destination)],
        ['mode', toGoogleMode(mode)],
    ];
    if (stops.length > 0) {
        // Stopover waypoints: every stop becomes its own leg, in the order the customer chose.
        params.push(['waypoints', stops.map(toParam).join('|')]);
    } else if (alternatives) {
        // Google ignores `alternatives` when waypoints are present.
        params.push(['alternatives', 'true']);
    }
    // Not sent: departure_time=now. It would give a traffic-aware ETA but bills the
    // Directions Advanced SKU, and Google omits duration_in_traffic when stopover
    // waypoints are present anyway. Add it here if the owner wants traffic ETAs.
    params.push(['key', GOOGLE_MAPS_API_KEY]);

    // Built by hand: React Native's URLSearchParams polyfill lacks set()/get().
    return `${DIRECTIONS_API_URL}?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

async function requestRoutes(url: string): Promise<any[]> {
    if (!GOOGLE_MAPS_API_KEY) {
        throw new RoutingError('MISSING_KEY', 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set');
    }

    let response: Response;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new RoutingError('NETWORK', error instanceof Error ? error.message : 'Network request failed');
    }

    if (!response.ok) {
        throw new RoutingError('HTTP_ERROR', `Directions API HTTP ${response.status}`, response.status);
    }

    let data: any;
    try {
        data = await response.json();
    } catch {
        throw new RoutingError('PARSE_ERROR', 'Directions API returned a non-JSON body', response.status);
    }

    const status: string = typeof data?.status === 'string' ? data.status : 'UNKNOWN_ERROR';
    if (status !== 'OK') {
        const code = (GOOGLE_STATUS_CODES.includes(status) ? status : 'UNKNOWN_ERROR') as RoutingErrorCode;
        const errorMessage = typeof data?.error_message === 'string' ? data.error_message.trim() : '';
        throw new RoutingError(code, errorMessage ? `${status}: ${errorMessage}` : status, response.status);
    }

    const routes: any[] = Array.isArray(data?.routes) ? data.routes : [];
    if (routes.length === 0) {
        throw new RoutingError('ZERO_RESULTS', 'ZERO_RESULTS', response.status);
    }
    return routes;
}

function toDirectionsRoute(route: any, index: number, origin: LatLng, destination: LatLng): DirectionsRoute {
    const legs: any[] = Array.isArray(route?.legs) ? route.legs : [];
    let coordinates: LatLng[] = [];
    let distance = 0;
    let duration = 0;

    for (const leg of legs) {
        distance += Number(leg?.distance?.value) || 0;
        duration += Number(leg?.duration_in_traffic?.value ?? leg?.duration?.value) || 0;

        // Steps carry the full road geometry; overview_polyline below is only a smoothed fallback.
        const steps: any[] = Array.isArray(leg?.steps) ? leg.steps : [];
        for (const step of steps) {
            if (typeof step?.polyline?.points === 'string') {
                coordinates = appendPath(coordinates, decodePolyline(step.polyline.points));
            }
        }
    }

    if (coordinates.length === 0 && typeof route?.overview_polyline?.points === 'string') {
        coordinates = decodePolyline(route.overview_polyline.points);
    }
    coordinates = coordinates.filter(isFinitePoint);

    const segments: DirectionsSegment[] =
        coordinates.length >= 2
            ? [{ coordinates: connectPins(origin, coordinates, destination), color: DEFAULT_ROUTE_COLOR }]
            : [];

    return {
        coordinates,
        segments,
        distance,
        duration,
        summary: typeof route?.summary === 'string' && route.summary ? route.summary : `Route ${index + 1}`,
    };
}

export const googleDirectionsApi = {
    /**
     * Route from origin to destination through `stops` (in order). Resolves to exactly one
     * route (Google returns no alternatives once waypoints are present). Throws RoutingError.
     */
    getRoutes: async (
        origin: LatLng,
        destination: LatLng,
        stops: LatLng[] = [],
        mode: TransportMode = 'car'
    ): Promise<DirectionsRoute[]> => {
        const routes = await requestRoutes(buildUrl(origin, destination, stops, mode, false));
        return routes.map((route, index) => toDirectionsRoute(route, index, origin, destination));
    },

    /** Coordinates of the best route only (driver job screens). Throws RoutingError. */
    getRoute: async (origin: LatLng, destination: LatLng, stops: LatLng[] = []): Promise<LatLng[]> => {
        const [route] = await googleDirectionsApi.getRoutes(origin, destination, stops, 'car');
        return route.coordinates;
    },

    /** Up to `maxAlternatives` A→B routes without stops. Throws RoutingError. */
    getRouteAlternatives: async (
        origin: LatLng,
        destination: LatLng,
        maxAlternatives: number = 3
    ): Promise<DirectionsRoute[]> => {
        const routes = await requestRoutes(buildUrl(origin, destination, [], 'car', true));
        return routes
            .slice(0, Math.max(1, maxAlternatives))
            .map((route, index) => toDirectionsRoute(route, index, origin, destination));
    },
};

// ---------------------------------------------------------------------------
// Refetch throttling. Every Directions call is billed, and the booking / job screens re-run
// their route effect on each 5 s location or order poll. Callers keep the last request in a
// ref and ask shouldRefetchRoute() before paying for a new one.
// ---------------------------------------------------------------------------

export interface RouteRequest {
    origin: LatLng;
    destination: LatLng;
    stops: LatLng[];
    mode: TransportMode;
}

export interface RouteRequestRecord {
    request: RouteRequest;
    /** Date.now() when the request was sent. */
    at: number;
    /** True when that request threw; allows a retry once ROUTE_REFETCH_MIN_INTERVAL_MS has passed. */
    failed: boolean;
    /**
     * RoutingError.code of that failure (undefined when it was not a RoutingError). Deterministic
     * codes (see isPermanentRoutingFailure) are not retried until the target changes.
     */
    failureCode?: RoutingErrorCode;
}

/** The origin must have moved at least this far before the same target is routed again. */
export const ROUTE_REFETCH_MIN_MOVE_METERS = 50;
/** Never route the same target more often than this (ETA refresh cadence: at most 2 requests/min). */
export const ROUTE_REFETCH_MIN_INTERVAL_MS = 30_000;
/** Points closer than this are the same place. */
const SAME_POINT_METERS = 1;

/**
 * Failures Google answers identically for an identical request. Retrying them on the 30 s cadence
 * would bill up to 120 requests/hour per screen for the same ZERO_RESULTS; wait for the target to
 * change instead. Quota (OVER_*), NETWORK, HTTP_ERROR, PARSE_ERROR and UNKNOWN_ERROR stay retryable.
 */
const PERMANENT_ROUTE_FAILURE_CODES: readonly RoutingErrorCode[] = [
    'ZERO_RESULTS',
    'NOT_FOUND',
    'REQUEST_DENIED',
    'INVALID_REQUEST',
    'MAX_WAYPOINTS_EXCEEDED',
    'MAX_ROUTE_LENGTH_EXCEEDED',
    'MISSING_KEY',
];

/** True when repeating the same request cannot produce a different answer. */
export function isPermanentRoutingFailure(code: RoutingErrorCode | undefined): boolean {
    return code !== undefined && PERMANENT_ROUTE_FAILURE_CODES.includes(code);
}

/** Same destination, same stops (in order) and same Google travel mode (car/truck/scooter all = driving). */
export function isSameRouteTarget(a: RouteRequest, b: RouteRequest): boolean {
    if (toGoogleMode(a.mode) !== toGoogleMode(b.mode)) return false;
    if (distanceMeters(a.destination, b.destination) > SAME_POINT_METERS) return false;
    if (a.stops.length !== b.stops.length) return false;
    return a.stops.every((stop, i) => distanceMeters(stop, b.stops[i]) <= SAME_POINT_METERS);
}

/**
 * Decide whether a new (billed) Directions request is worth it.
 * Refetch when nothing was requested yet or the target (destination / stops / mode) changed.
 * For the same target: a failure with a deterministic code (isPermanentRoutingFailure) is never
 * retried; otherwise refetch only once ROUTE_REFETCH_MIN_INTERVAL_MS has passed AND either the
 * origin moved >= ROUTE_REFETCH_MIN_MOVE_METERS or the previous request failed.
 * Otherwise the caller keeps the route it already drew: no flicker, no request.
 *
 * Callers must pass real origins only. A placeholder (pickup while GPS or the driver position is
 * still unknown) is recorded like any other request and blocks the real one for the interval.
 */
export function shouldRefetchRoute(
    last: RouteRequestRecord | null,
    next: RouteRequest,
    now: number = Date.now()
): boolean {
    if (!last) return true;
    if (!isSameRouteTarget(last.request, next)) return true;
    // Same request, same answer: do not pay for the same ZERO_RESULTS / REQUEST_DENIED again.
    if (last.failed && isPermanentRoutingFailure(last.failureCode)) return false;
    if (now - last.at < ROUTE_REFETCH_MIN_INTERVAL_MS) return false;
    if (last.failed) return true;
    return distanceMeters(last.request.origin, next.origin) >= ROUTE_REFETCH_MIN_MOVE_METERS;
}

/**
 * Between refetches, draw the remaining route from `point` (the live position): drop the part of
 * `path` before the vertex closest to the point and start the line at the point itself.
 */
export function trimRouteToPoint(path: LatLng[], point: LatLng): LatLng[] {
    if (path.length === 0) return path;
    let nearest = 0;
    let nearestDistance = Infinity;
    for (let i = 0; i < path.length; i++) {
        const d = distanceMeters(point, path[i]);
        if (d < nearestDistance) {
            nearestDistance = d;
            nearest = i;
        }
    }
    return [point, ...path.slice(nearest)];
}
