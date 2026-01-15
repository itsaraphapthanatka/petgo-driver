import { create } from "zustand";
import { ChatMessage } from "../types/chat";

interface ChatState {
    messages: ChatMessage[];
    typing: boolean;
    addMessage: (msg: ChatMessage) => void;
    setTyping: (val: boolean) => void;
    setMessages: (msgs: ChatMessage[]) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    typing: false,

    addMessage: (msg: ChatMessage) =>
        set((state) => {
            // Deduplication logic
            const existingIndex = state.messages.findIndex(m => {
                // 1. Exact ID match
                if (msg.id && m.id) return msg.id === m.id;

                // 2. Match optimistic message with server confirmation
                // If msg has ID and m doesn't, check if they are "same enough"
                if (msg.id && !m.id) {
                    return (
                        m.message === msg.message &&
                        m.user_id === msg.user_id &&
                        m.role === msg.role
                    );
                }

                // 3. Match incoming optimistic with existing optimistic
                if (!msg.id && !m.id) {
                    return (
                        m.message === msg.message &&
                        m.user_id === msg.user_id &&
                        m.role === msg.role &&
                        Math.abs(new Date(msg.created_at || '').getTime() - new Date(m.created_at || '').getTime()) < 10000
                    );
                }

                return false;
            });

            if (existingIndex !== -1) {
                // If the new message has more info (like an ID), update the existing one
                if (msg.id && !state.messages[existingIndex].id) {
                    const newMessages = [...state.messages];
                    newMessages[existingIndex] = msg;
                    return { messages: newMessages };
                }
                // Otherwise, it's a true duplicate, ignore it
                return state;
            }

            return {
                messages: [...state.messages, msg],
            };
        }),

    setMessages: (msgs: ChatMessage[]) => set({ messages: msgs }),

    setTyping: (val: boolean) => set({ typing: val }),

    clearMessages: () => set({ messages: [], typing: false }),
}));
