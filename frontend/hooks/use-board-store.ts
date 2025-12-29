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

    // Sync
    fetchDetails: (roomId: string) => Promise<void>;

    // Selector for current room nodes
    getNodes: () => BoardNode[];

    // Node operations (work on current room)
    addNode: (node: Omit<BoardNode, 'id' | 'createdAt'>) => void;
    updateNode: (id: string, updates: Partial<BoardNode>) => void;
    removeNode: (id: string) => void;
    setNodes: (nodes: BoardNode[]) => void;
    reset: () => void;
    clearRoom: (roomId: string) => void;
}

const emptyRoomData: RoomBoardData = {
    nodes: [],
    lastUpdated: Date.now(),
};

// Helper to debounce or throttle saves could be added here
const saveToServer = async (roomId: string, nodes: BoardNode[]) => {
    try {
        await fetch(`/api/rooms/${roomId}/nodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes })
        });
    } catch (e) {
        console.error("Failed to save board", e);
    }
};

export const useBoardStore = create<BoardStore>()((set, get) => ({
    rooms: {},
    currentRoomId: null,

    getNodes: () => {
        const { rooms, currentRoomId } = get();
        if (!currentRoomId || !rooms[currentRoomId]) return [];
        return rooms[currentRoomId].nodes;
    },

    fetchDetails: async (roomId: string) => {
        try {
            const res = await fetch(`/api/rooms/${roomId}`);
            if (res.ok) {
                const { room } = await res.json();
                if (room && room.board && room.board.nodes) {
                    set((state) => ({
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                nodes: room.board.nodes as BoardNode[],
                                lastUpdated: Date.now()
                            }
                        }
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to fetch room details", e);
        }
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
        // Trigger fetch on room switch
        get().fetchDetails(roomId);
    },

    addNode: (node) => {
        set((state) => {
            const roomId = state.currentRoomId;
            if (!roomId) return state;

            const room = state.rooms[roomId] || { ...emptyRoomData };
            const newNode = { ...node, id: uuidv4(), createdAt: Date.now() } as BoardNode;

            const newNodes = [...room.nodes, newNode];
            // Side effect: save
            saveToServer(roomId, newNodes);

            return {
                rooms: {
                    ...state.rooms,
                    [roomId]: {
                        nodes: newNodes,
                        lastUpdated: Date.now(),
                    },
                },
            };
        });
    },

    updateNode: (id, updates) => {
        set((state) => {
            const roomId = state.currentRoomId;
            if (!roomId || !state.rooms[roomId]) return state;

            const room = state.rooms[roomId];
            const newNodes = room.nodes.map((node) =>
                node.id === id ? { ...node, ...updates } : node
            );

            saveToServer(roomId, newNodes);

            return {
                rooms: {
                    ...state.rooms,
                    [roomId]: {
                        nodes: newNodes,
                        lastUpdated: Date.now(),
                    },
                },
            };
        });
    },

    removeNode: (id) => {
        set((state) => {
            const roomId = state.currentRoomId;
            if (!roomId || !state.rooms[roomId]) return state;

            const room = state.rooms[roomId];
            const newNodes = room.nodes.filter((node) => node.id !== id);

            saveToServer(roomId, newNodes);

            return {
                rooms: {
                    ...state.rooms,
                    [roomId]: {
                        nodes: newNodes,
                        lastUpdated: Date.now(),
                    },
                },
            };
        });
    },

    setNodes: (nodes) => {
        set((state) => {
            const roomId = state.currentRoomId;
            if (!roomId) return state;

            saveToServer(roomId, nodes);

            return {
                rooms: {
                    ...state.rooms,
                    [roomId]: {
                        nodes,
                        lastUpdated: Date.now(),
                    },
                },
            };
        });
    },

    reset: () =>
        set((state) => {
            const roomId = state.currentRoomId;
            if (!roomId) return state;
            // Should we clear server too? Maybe not 'reset' but 'clear'? 
            // Assuming reset is local state reset or clearing board.
            // Let's assume it clears board.
            saveToServer(roomId, []);

            return {
                rooms: {
                    ...state.rooms,
                    [roomId]: { ...emptyRoomData },
                },
            };
        }),

    clearRoom: (roomId: string) =>
        set((state) => {
            const { [roomId]: _, ...remainingRooms } = state.rooms;
            return {
                rooms: remainingRooms,
            };
        }),
}));
