/**
 * Error thrown by services/* when the backend answers a non-2xx status.
 *
 * FastAPI puts the human-readable reason in `{"detail": "..."}` (request-validation errors send a
 * list of `{loc, msg, type}`). `detail` is that text; `message` keeps the historical
 * "<context>: <status> - <detail>" shape so existing `.message.includes('401')` checks still work.
 * Screens branch on `status` (e.g. 409 from POST /orders/ = "Price changed") instead of parsing text.
 */
export class ApiError extends Error {
    readonly status: number;
    readonly detail: string;

    constructor(status: number, detail: string, context: string) {
        super(`${context}: ${status} - ${detail}`);
        // Keep the prototype chain intact when classes are transpiled, so instanceof works
        Object.setPrototypeOf(this, ApiError.prototype);
        this.name = 'ApiError';
        this.status = status;
        this.detail = detail;
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

/** FastAPI `detail` from a response body (string or validation list); the raw text when it is not JSON. */
export function parseApiErrorDetail(body: string): string {
    const text = body.trim();
    if (!text) return '';
    try {
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
            const detail = (parsed as { detail?: unknown }).detail;
            if (typeof detail === 'string') return detail;
            if (Array.isArray(detail)) {
                return detail
                    .map((item) =>
                        item && typeof item === 'object' && typeof (item as { msg?: unknown }).msg === 'string'
                            ? (item as { msg: string }).msg
                            : JSON.stringify(item)
                    )
                    .join('; ');
            }
        }
    } catch {
        // Not JSON (HTML error page, plain text): return it as-is
    }
    return text;
}

/** Build an ApiError from a non-2xx fetch Response (consumes the body). */
export async function apiErrorFromResponse(response: Response, context: string): Promise<ApiError> {
    let body = '';
    try {
        body = await response.text();
    } catch {
        body = '';
    }
    return new ApiError(response.status, parseApiErrorDetail(body) || `HTTP ${response.status}`, context);
}

/** Human-readable reason for any thrown value: ApiError detail, Error message, or String(). */
export function errorDetail(error: unknown): string {
    if (isApiError(error)) return error.detail;
    if (error instanceof Error) return error.message;
    return String(error);
}
