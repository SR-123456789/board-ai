import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BoardNode } from '@/types/board';
import { v4 as uuidv4 } from 'uuid';

interface RoomBoardData {
    nodes: BoardNode[];
    lastUpdated: number;
}

interface BoardStore {
    rooms: { [roomId: string]: RoomBoardData };
    currentRoomId: string | null;

    // Room management
    setCurrentRoom: (roomId: string) => void;

    // Selector for current room nodes
    getNodes: () => BoardNode[];

    // Node operations (work on current room)
    addNode: (node: Omit<BoardNode, 'id' | 'createdAt'>) => void;
    updateNode: (id: string, updates: Partial<BoardNode>) => void;
    removeNode: (id: string) => void;
    setNodes: (nodes: BoardNode[]) => void;
    reset: () => void;
}

const emptyRoomData: RoomBoardData = {
    nodes: [],
    lastUpdated: Date.now(),
};

export const useBoardStore = create<BoardStore>()(
    persist(
        (set, get) => ({
            rooms: {},
            currentRoomId: null,

            // Function to get nodes for current room
            getNodes: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId || !rooms[currentRoomId]) return [];
                return rooms[currentRoomId].nodes;
            },

            setCurrentRoom: (roomId: string) => {
                set((state) => {
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

            addNode: (node) =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const room = state.rooms[roomId] || { ...emptyRoomData };
                    const newNode = { ...node, id: uuidv4(), createdAt: Date.now() } as BoardNode;

                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                nodes: [...room.nodes, newNode],
                                lastUpdated: Date.now(),
                            },
                        },
                    };
                }),

            updateNode: (id, updates) =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId || !state.rooms[roomId]) return state;

                    const room = state.rooms[roomId];
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                nodes: room.nodes.map((node) =>
                                    node.id === id ? { ...node, ...updates } : node
                                ),
                                lastUpdated: Date.now(),
                            },
                        },
                    };
                }),

            removeNode: (id) =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId || !state.rooms[roomId]) return state;

                    const room = state.rooms[roomId];
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                nodes: room.nodes.filter((node) => node.id !== id),
                                lastUpdated: Date.now(),
                            },
                        },
                    };
                }),

            setNodes: (nodes) =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                nodes,
                                lastUpdated: Date.now(),
                            },
                        },
                    };
                }),

            reset: () =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: { ...emptyRoomData },
                        },
                    };
                }),
        }),
        {
            name: 'board-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
