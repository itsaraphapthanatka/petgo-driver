import { Platform } from 'react-native';

let socket: WebSocket | null = null;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.144:8000';

// Convert HTTP/HTTPS URL to WS/WSS for WebSocket connections
const convertToWebSocketUrl = (url: string): string => {
    return url.replace(/^http/, 'ws');
};

const WS_BASE_URL = convertToWebSocketUrl(API_BASE_URL);

export const connectChat = (
    orderId: number,
    userId: number,
    role: "customer" | "driver",
    onMessage: (data: any) => void
) => {
    const url = `${WS_BASE_URL}/ws/chat/${orderId}?user_id=${userId}&role=${role}`;

    // If socket exists and is connected/connecting to the same URL, don't reconnect
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        if (socket.url === url) {
            console.log("WebSocket already connecting/connected to", url);
            return;
        }
    }

    // Close existing socket if open
    if (socket) {
        console.log("Closing existing socket before reconnecting...");
        socket.close();
    }

    console.log("Connecting to Chat WebSocket:", url);
    socket = new WebSocket(url);

    socket.onopen = () => {
        console.log("Chat WebSocket Connected");
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("Received WebSocket Message:", data);
            onMessage(data);
        } catch (e) {
            console.error("Error parsing websocket message", e);
        }
    };

    socket.onerror = (e: any) => {
        console.log("Chat WebSocket Error:", e.message);
    };

    socket.onclose = (e) => {
        console.log(`Chat WebSocket Closed. Code: ${e.code}, Reason: ${e.reason}`);
    };
};

export const disconnectChat = () => {
    if (socket) {
        console.log("Disconnecting Chat WebSocket");
        socket.close();
        socket = null;
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
