
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type Role = 'user' | 'assistant';

export interface Message {
    id: string;
    role: Role;
    content: string;
    parts?: any[]; // For multimodal
    chatTurnId?: string; // Grouping
    createdAt?: number;
    roomId?: string;
}

export type RoomMode = 'normal' | 'managed';

interface RoomData {
    messages: Message[];
    suggestedQuestions: string[];
    mode: RoomMode;
    lastUpdated: number;
}

interface ChatState {
    rooms: { [roomId: string]: RoomData };
    currentRoomId: string | null;

    // Actions
    setCurrentRoom: (roomId: string) => void;

    getMessages: () => Message[];
    fetchMessages: (roomId: string) => Promise<void>;

    addMessage: (message: Message, roomId?: string) => void; // Revert to accepting full Message for compatibility
    updateMessage: (messageId: string, updates: Partial<Message>) => void;
    setMessages: (roomId: string, messages: Message[]) => void;
    clearMessages: (roomId: string) => void;

    setSuggestedQuestions: (questions: string[]) => void;
    getSuggestedQuestions: () => string[];
    getMode: (roomId?: string) => RoomMode;
    setMode: (roomId: string, mode: RoomMode) => void;
    clearRoom: (roomId: string) => void;
}

const emptyRoomData: RoomData = {
    messages: [],
    suggestedQuestions: [],
    mode: 'normal', // Default mode object
    lastUpdated: Date.now()
};

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            rooms: {},
            currentRoomId: null,

            setCurrentRoom: (roomId) => {
                set((state) => {
                    if (!state.rooms[roomId]) {
                        return {
                            currentRoomId: roomId,
                            rooms: {
                                ...state.rooms,
                                [roomId]: { ...emptyRoomData }
                            }
                        };
                    }
                    return { currentRoomId: roomId };
                });
                get().fetchMessages(roomId);
            },

            getMessages: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId || !rooms[currentRoomId]) return [];
                return rooms[currentRoomId].messages;
            },

            fetchMessages: async (roomId) => {
                try {
                    const res = await fetch(`/api/rooms/${roomId}`);
                    if (res.ok) {
                        const { room } = await res.json();
                        if (room && room.messages) {
                            set((state) => ({
                                rooms: {
                                    ...state.rooms,
                                    [roomId]: {
                                        ...(state.rooms[roomId] || emptyRoomData), // Keep other state like mode, or initialize
                                        messages: room.messages,
                                        lastUpdated: Date.now()
                                    }
                                }
                            }));
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch messages", e);
                }
            },

            addMessage: (message, roomId) =>
                set((state) => {
                    const targetRoomId = roomId || state.currentRoomId;
                    if (!targetRoomId) return state;

                    const room = state.rooms[targetRoomId] || { ...emptyRoomData };
                    const newMessage = {
                        ...message,
                        createdAt: message.createdAt || Date.now(),
                        roomId: targetRoomId
                    };

                    return {
                        rooms: {
                            ...state.rooms,
                            [targetRoomId]: {
                                ...room,
                                messages: [...room.messages, newMessage],
                                lastUpdated: Date.now()
                            }
                        }
                    };
                }),

            updateMessage: (messageId, updates) =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId || !state.rooms[roomId]) return state;

                    const room = state.rooms[roomId];
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...room,
                                messages: room.messages.map((m) =>
                                    m.id === messageId ? { ...m, ...updates } : m
                                ),
                                lastUpdated: Date.now(),
                            },
                        },
                    };
                }),

            setMessages: (roomId, messages) =>
                set((state) => ({
                    rooms: {
                        ...state.rooms,
                        [roomId]: {
                            ...(state.rooms[roomId] || emptyRoomData), // Ensure room exists or initialize
                            messages,
                            lastUpdated: Date.now()
                        }
                    }
                })),

            clearMessages: (roomId) =>
                set((state) => ({
                    rooms: {
                        ...state.rooms,
                        [roomId]: {
                            ...(state.rooms[roomId] || emptyRoomData), // Keep mode, suggestedQuestions
                            messages: [],
                            lastUpdated: Date.now()
                        }
                    }
                })),

            setSuggestedQuestions: (questions) => {
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...(state.rooms[roomId] || emptyRoomData), // Ensure room exists or initialize
                                suggestedQuestions: questions,
                            },
                        },
                    };
                });
            },

            getSuggestedQuestions: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId || !rooms[currentRoomId]) return [];
                return rooms[currentRoomId].suggestedQuestions;
            },

            getMode: (roomId) => {
                const { rooms, currentRoomId } = get();
                const targetId = roomId || currentRoomId;
                if (!targetId || !rooms[targetId]) return 'normal';
                return rooms[targetId].mode;
            },

            setMode: (roomId, mode) => {
                set((state) => ({
                    rooms: {
                        ...state.rooms,
                        [roomId]: {
                            ...(state.rooms[roomId] || emptyRoomData), // Initialize if needed
                            mode
                        }
                    }
                }));
            },

            clearRoom: (roomId: string) => {
                set((state) => {
                    const { [roomId]: _, ...remainingRooms } = state.rooms;
                    return {
                        rooms: remainingRooms,
                    };
                });
            },
        }),
        {
            name: 'chat-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

