import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    parts?: any[];
    chatTurnId?: string;
};

interface RoomData {
    messages: Message[];
    suggestedQuestions: string[];
}

interface ChatStore {
    rooms: { [roomId: string]: RoomData };
    currentRoomId: string | null;

    // Actions
    setCurrentRoom: (roomId: string) => void;
    getMessages: () => Message[];
    addMessage: (message: Message) => void;
    updateMessage: (messageId: string, updates: Partial<Message>) => void;
    setSuggestedQuestions: (questions: string[]) => void;
    getSuggestedQuestions: () => string[];
    clearRoom: (roomId: string) => void;
}

const emptyRoomData: RoomData = {
    messages: [],
    suggestedQuestions: [],
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

            clearRoom: (roomId: string) => {
                set((state) => ({
                    rooms: {
                        ...state.rooms,
                        [roomId]: { ...emptyRoomData },
                    },
                }));
            },
        }),
        {
            name: 'chat-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
