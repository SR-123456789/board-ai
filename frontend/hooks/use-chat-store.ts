import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    parts?: any[];
    chatTurnId?: string;
};

export type RoomMode = 'normal' | 'managed';

interface RoomData {
    messages: Message[];
    suggestedQuestions: string[];
    mode: RoomMode;
}

interface ChatStore {
    rooms: { [roomId: string]: RoomData };
    currentRoomId: string | null;

    // Actions
    setCurrentRoom: (roomId: string, mode?: RoomMode) => void;
    getMessages: () => Message[];
    addMessage: (message: Message) => void;
    updateMessage: (messageId: string, updates: Partial<Message>) => void;
    setSuggestedQuestions: (questions: string[]) => void;
    getSuggestedQuestions: () => string[];
    getMode: (roomId?: string) => RoomMode;
    setMode: (roomId: string, mode: RoomMode) => void;
    clearRoom: (roomId: string) => void;
}

const emptyRoomData: RoomData = {
    messages: [],
    suggestedQuestions: [],
    mode: 'normal',
};

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => ({
            rooms: {},
            currentRoomId: null,

            setCurrentRoom: (roomId: string) => {
                set((state) => {
                    // Initialize room if not exists
                    if (!state.rooms[roomId]) {
                        return {
                            currentRoomId: roomId,
                            rooms: {
                                ...state.rooms,
                                [roomId]: { ...emptyRoomData },
                            },
                        };
                    }
                    return { currentRoomId: roomId };
                });
            },

            getMessages: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId || !rooms[currentRoomId]) return [];
                return rooms[currentRoomId].messages;
            },

            addMessage: (message: Message) => {
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const room = state.rooms[roomId] || { ...emptyRoomData };
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...room,
                                messages: [...room.messages, message],
                            },
                        },
                    };
                });
            },

            updateMessage: (messageId: string, updates: Partial<Message>) => {
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
                            },
                        },
                    };
                });
            },

            setSuggestedQuestions: (questions: string[]) => {
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const room = state.rooms[roomId] || { ...emptyRoomData };
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...room,
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

            getMode: (roomId?: string) => {
                const { rooms, currentRoomId } = get();
                const targetRoomId = roomId || currentRoomId;
                if (!targetRoomId || !rooms[targetRoomId]) return 'normal';
                return rooms[targetRoomId].mode || 'normal';
            },

            setMode: (roomId: string, mode: RoomMode) => {
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room) return state;
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: { ...room, mode },
                        },
                    };
                });
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
