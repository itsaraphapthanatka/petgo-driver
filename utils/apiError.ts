/**
 * Error thrown by services/* when the backend answers a non-2xx status.
 *
 * FastAPI puts the human-readable reason in `{"detail": "..."}`. Request-validation errors send a
 * list of `{loc, msg, type}`, and some endpoints send an object, e.g. POST /orders/ 409 since
 * 2026-09-07: `{"code": "price_changed", "message": "...", "fare": 260, "vehicle_type": "car", "quoted": 220}`.
 * `detail` is always display text (the object's `message` when it has one); `detailObject` is the
 * object form when the backend sent one, so screens read fields instead of parsing text. `message`
 * keeps the historical "<context>: <status> - <detail>" shape so existing `.message.includes('401')`
 * checks still work. Screens branch on `status` (e.g. 409 = "Price changed") instead of parsing text.
 */
export class ApiError extends Error {
    readonly status: number;
    readonly detail: string;
    /** `detail` as sent when it was a JSON object (not a string or validation list); null otherwise. */
    readonly detailObject: Record<string, unknown> | null;

    constructor(status: number, detail: string, context: string, detailObject: Record<string, unknown> | null = null) {
        super(`${context}: ${status} - ${detail}`);
        // Keep the prototype chain intact when classes are transpiled, so instanceof works
        Object.setPrototypeOf(this, ApiError.prototype);
        this.name = 'ApiError';
        this.status = status;
        this.detail = detail;
        this.detailObject = detailObject;
    }
}

export function isApiError(error: unknown): error is ApiError {
    if (error instanceof ApiError) return true;
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as { name?: unknown }).name === 'ApiError' &&
        typeof (error as { status?: unknown }).status === 'number'
    );
}

export interface ParsedApiErrorBody {
    /** Display text: FastAPI `detail` (string, joined validation msgs, or an object's `message`); raw text when not JSON. */
    detail: string;
    /** The `detail` object itself when the backend sent one; null for string / list / non-JSON bodies. */
    detailObject: Record<string, unknown> | null;
}

/** FastAPI `detail` from a response body in both forms (see ParsedApiErrorBody). */
export function parseApiErrorBody(body: string): ParsedApiErrorBody {
    const text = body.trim();
    if (!text) return { detail: '', detailObject: null };
    try {
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
            const detail = (parsed as { detail?: unknown }).detail;
            if (typeof detail === 'string') return { detail, detailObject: null };
            if (Array.isArray(detail)) {
                return {
                    detail: detail
                        .map((item) =>
                            item && typeof item === 'object' && typeof (item as { msg?: unknown }).msg === 'string'
                                ? (item as { msg: string }).msg
                                : JSON.stringify(item)
                        )
                        .join('; '),
                    detailObject: null,
                };
            }
            if (detail && typeof detail === 'object') {
                const obj = detail as Record<string, unknown>;
                const message = typeof obj.message === 'string' ? obj.message : JSON.stringify(obj);
                return { detail: message, detailObject: obj };
            }
        }
    } catch {
        // Not JSON (HTML error page, plain text): return it as-is
    }
    return { detail: text, detailObject: null };
}

/** FastAPI `detail` from a response body as display text; the raw text when it is not JSON. */
export function parseApiErrorDetail(body: string): string {
    return parseApiErrorBody(body).detail;
}

/** Build an ApiError from a non-2xx fetch Response (consumes the body). */
export async function apiErrorFromResponse(response: Response, context: string): Promise<ApiError> {
    let body = '';
    try {
        body = await response.text();
    } catch {
        body = '';
    }
    const { detail, detailObject } = parseApiErrorBody(body);
    return new ApiError(response.status, detail || `HTTP ${response.status}`, context, detailObject);
}

/** Human-readable reason for any thrown value: ApiError detail, Error message, or String(). */
export function errorDetail(error: unknown): string {
    if (isApiError(error)) return error.detail;
    if (error instanceof Error) return error.message;
    return String(error);
}
