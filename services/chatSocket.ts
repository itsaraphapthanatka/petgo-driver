import { tokenManager } from './authService';

let socket: WebSocket | null = null;
let connectedOrderId: number | null = null;
/** Guards against two connect() calls racing while the token is read from storage. */
let connectSeq = 0;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Convert HTTP/HTTPS URL to WS/WSS for WebSocket connections
const convertToWebSocketUrl = (url: string): string => {
    return url.replace(/^http/, 'ws');
};

const WS_BASE_URL = convertToWebSocketUrl(API_BASE_URL);

/**
 * Why the chat socket can fail without a message arriving:
 * - `auth`: no token stored, or the server closed the connection with an auth code because the token
 *   is expired / invalid / not a party to this order. Retrying cannot help, so the screen says so.
 * - `connection`: anything else - network, server restart, or a handshake the server refused before
 *   accepting it (React Native surfaces that without a close code, so it cannot be told apart).
 */
export type ChatSocketFailure = 'auth' | 'connection';

/**
 * WebSocket close codes that mean "you may not have this connection".
 * 1008 = policy violation (what FastAPI sends when it closes an accepted socket after rejecting the
 * token), 3000 = unauthorized (IANA registered for libraries), 4401/4403 = app-level auth codes.
 */
const AUTH_CLOSE_CODES = [1008, 3000, 4401, 4403];

/** Drop a socket without its handlers firing (an app-initiated close is not a failure). */
const detach = (ws: WebSocket) => {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close();
};

/**
 * Connect to `/ws/chat/{order_id}`.
 *
 * The JWT travels in the query string (`?token=`) because React Native's WebSocket cannot set an
 * Authorization header on the handshake; the server decodes `user_id`/`role` from it. That makes the
 * URL a secret: it must never be logged, and it must not be handed to error reporting either.
 *
 * `userId` / `role` are only kept for backwards compatibility: the current server still declares them
 * as required query params (backend `app/main.py`, `websocket_chat`), so a build that stops sending
 * them cannot connect until the token-authenticated handler is deployed. The new handler ignores
 * them - delete both arguments (and the two query params) once it is live everywhere.
 *
 * There is deliberately no reconnect loop: with a bad token every retry fails the same way and would
 * spin forever, so a failure is reported to the caller and the socket stays closed.
 */
export const connectChat = async (
    orderId: number,
    userId: number,
    role: "customer" | "driver",
    onMessage: (data: any) => void,
    onFailure?: (reason: ChatSocketFailure) => void
): Promise<void> => {
    // Already connected (or connecting) to this order: nothing to do
    if (
        socket &&
        connectedOrderId === orderId &&
        (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
        return;
    }

    const seq = ++connectSeq;

    if (socket) {
        detach(socket);
        socket = null;
        connectedOrderId = null;
    }

    const token = await tokenManager.getToken();
    if (!token) {
        onFailure?.('auth');
        return;
    }
    // A newer connectChat/disconnectChat ran while the token was being read from storage
    if (seq !== connectSeq) return;

    const url =
        `${WS_BASE_URL}/ws/chat/${orderId}` +
        `?token=${encodeURIComponent(token)}` +
        `&user_id=${encodeURIComponent(String(userId))}&role=${encodeURIComponent(role)}`;

    // Never log `url` (it carries the token). Order id only.
    console.log(`Connecting chat WebSocket for order ${orderId}`);
    const ws = new WebSocket(url);
    socket = ws;
    connectedOrderId = orderId;

    let opened = false;

    ws.onopen = () => {
        opened = true;
        console.log('Chat WebSocket connected');
    };

    ws.onmessage = (event) => {
        try {
            onMessage(JSON.parse(event.data));
        } catch (e) {
            console.error('Error parsing websocket message', e);
        }
    };

    ws.onerror = (e: any) => {
        // React Native reports handshake rejections here as well ("Expected HTTP 101 response but was
        // '403 Forbidden'"); onclose decides what it means. The message is the handshake/network
        // reason only - it never contains the request URL, so it cannot leak the token.
        console.log('Chat WebSocket error:', e?.message);
    };

    ws.onclose = (e) => {
        if (socket === ws) {
            socket = null;
            connectedOrderId = null;
        }
        const isAuthFailure = AUTH_CLOSE_CODES.includes(e.code);
        console.log(`Chat WebSocket closed. Code: ${e.code}, opened: ${opened}, authFailure: ${isAuthFailure}`);
        onFailure?.(isAuthFailure ? 'auth' : 'connection');
    };
};

export const disconnectChat = () => {
    connectSeq++; // cancels a connect that is still reading the token
    if (socket) {
        console.log('Disconnecting chat WebSocket');
        detach(socket);
        socket = null;
        connectedOrderId = null;
    }
};

export const sendMessage = (payload: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
    } else {
        console.warn("WebSocket not open, cannot send message. State:", socket?.readyState);
    }
};

export const sendTyping = (isTyping: boolean) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
            JSON.stringify({ type: "typing", is_typing: isTyping })
        );
    }
};
