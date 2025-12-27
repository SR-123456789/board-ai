import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BoardState, BoardNode } from '@/types/board';
import { v4 as uuidv4 } from 'uuid';

interface BoardStore extends BoardState {
    addNode: (node: Omit<BoardNode, 'id' | 'createdAt'>) => void;
    updateNode: (id: string, updates: Partial<BoardNode>) => void;
    removeNode: (id: string) => void;
    setNodes: (nodes: BoardNode[]) => void;
    reset: () => void;
}

const initialState: BoardState = {
    id: 'default',
    nodes: [],
    lastUpdated: Date.now(),
};

export const useBoardStore = create<BoardStore>()(
    persist(
        (set) => ({
            ...initialState,
            addNode: (node) =>
                set((state) => ({
                    nodes: [
                        ...state.nodes,
                        { ...node, id: uuidv4(), createdAt: Date.now() } as BoardNode,
                    ],
                    lastUpdated: Date.now(),
                })),
            updateNode: (id, updates) =>
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === id ? { ...node, ...updates } : node
                    ),
                    lastUpdated: Date.now(),
                })),
            removeNode: (id) =>
                set((state) => ({
                    nodes: state.nodes.filter((node) => node.id !== id),
                    lastUpdated: Date.now(),
                })),
            setNodes: (nodes) =>
                set(() => ({
                    nodes,
                    lastUpdated: Date.now(),
                })),
            reset: () => set(initialState),
        }),
        {
            name: 'board-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
