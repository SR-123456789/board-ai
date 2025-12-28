import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ロードマップの節
export interface Section {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    importance: 'normal' | 'focus' | 'skip';
}

// ロードマップの単元
export interface Unit {
    id: string;
    title: string;
    sections: Section[];
}

// ロードマップ全体
export interface Roadmap {
    goal: string;
    currentLevel: string;
    units: Unit[];
}

// Managed Teacher用のルーム状態
export interface ManagedRoomState {
    phase: 'hearing_level' | 'hearing_goal' | 'generating_roadmap' | 'learning' | 'completed';
    roadmap: Roadmap | null;
    currentUnitIndex: number;
    currentSectionIndex: number;
    hearingData: {
        level?: string;
        goal?: string;
    };
}

interface ManagedStore {
    rooms: { [roomId: string]: ManagedRoomState };

    // Actions
    initRoom: (roomId: string) => void;
    getState: (roomId: string) => ManagedRoomState | null;
    setPhase: (roomId: string, phase: ManagedRoomState['phase']) => void;
    setHearingData: (roomId: string, data: Partial<ManagedRoomState['hearingData']>) => void;
    setRoadmap: (roomId: string, roadmap: Roadmap) => void;
    updateSectionStatus: (roomId: string, unitIndex: number, sectionIndex: number, status: Section['status']) => void;
    updateSectionImportance: (roomId: string, unitIndex: number, sectionIndex: number, importance: Section['importance']) => void;
    advanceToNextSection: (roomId: string) => boolean; // returns false if completed
    goToSection: (roomId: string, unitIndex: number, sectionIndex: number) => void;
    clearRoom: (roomId: string) => void;
}

const initialRoomState: ManagedRoomState = {
    phase: 'hearing_level',
    roadmap: null,
    currentUnitIndex: 0,
    currentSectionIndex: 0,
    hearingData: {},
};

export const useManagedStore = create<ManagedStore>()(
    persist(
        (set, get) => ({
            rooms: {},

            initRoom: (roomId: string) => {
                set((state) => {
                    if (state.rooms[roomId]) return state;
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: { ...initialRoomState },
                        },
                    };
                });
            },

            getState: (roomId: string) => {
                return get().rooms[roomId] || null;
            },

            setPhase: (roomId: string, phase: ManagedRoomState['phase']) => {
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room) return state;
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: { ...room, phase },
                        },
                    };
                });
            },

            setHearingData: (roomId: string, data: Partial<ManagedRoomState['hearingData']>) => {
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room) return state;
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...room,
                                hearingData: { ...room.hearingData, ...data },
                            },
                        },
                    };
                });
            },

            setRoadmap: (roomId: string, roadmap: Roadmap) => {
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room) return state;
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...room,
                                roadmap,
                                phase: 'learning',
                                currentUnitIndex: 0,
                                currentSectionIndex: 0,
                            },
                        },
                    };
                });
            },

            updateSectionStatus: (roomId: string, unitIndex: number, sectionIndex: number, status: Section['status']) => {
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room?.roadmap) return state;

                    const newUnits = [...room.roadmap.units];
                    if (newUnits[unitIndex]?.sections[sectionIndex]) {
                        newUnits[unitIndex] = {
                            ...newUnits[unitIndex],
                            sections: newUnits[unitIndex].sections.map((s, i) =>
                                i === sectionIndex ? { ...s, status } : s
                            ),
                        };
                    }

                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...room,
                                roadmap: { ...room.roadmap, units: newUnits },
                            },
                        },
                    };
                });
            },

            updateSectionImportance: (roomId: string, unitIndex: number, sectionIndex: number, importance: Section['importance']) => {
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room?.roadmap) return state;

                    const newUnits = [...room.roadmap.units];
                    if (newUnits[unitIndex]?.sections[sectionIndex]) {
                        newUnits[unitIndex] = {
                            ...newUnits[unitIndex],
                            sections: newUnits[unitIndex].sections.map((s, i) =>
                                i === sectionIndex ? { ...s, importance } : s
                            ),
                        };
                    }

                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...room,
                                roadmap: { ...room.roadmap, units: newUnits },
                            },
                        },
                    };
                });
            },

            advanceToNextSection: (roomId: string) => {
                const room = get().rooms[roomId];
                if (!room?.roadmap) return false;

                let { currentUnitIndex, currentSectionIndex } = room;
                const units = room.roadmap.units;

                // Mark current as completed
                get().updateSectionStatus(roomId, currentUnitIndex, currentSectionIndex, 'completed');

                // Find next section (skip sections marked as 'skip')
                let found = false;
                while (!found) {
                    currentSectionIndex++;
                    if (currentSectionIndex >= units[currentUnitIndex].sections.length) {
                        currentUnitIndex++;
                        currentSectionIndex = 0;
                    }

                    if (currentUnitIndex >= units.length) {
                        // Completed all
                        set((state) => ({
                            rooms: {
                                ...state.rooms,
                                [roomId]: { ...room, phase: 'completed' },
                            },
                        }));
                        return false;
                    }

                    const section = units[currentUnitIndex].sections[currentSectionIndex];
                    if (section.importance !== 'skip') {
                        found = true;
                    }
                }

                set((state) => ({
                    rooms: {
                        ...state.rooms,
                        [roomId]: {
                            ...room,
                            currentUnitIndex,
                            currentSectionIndex,
                        },
                    },
                }));

                get().updateSectionStatus(roomId, currentUnitIndex, currentSectionIndex, 'in_progress');
                return true;
            },

            goToSection: (roomId: string, unitIndex: number, sectionIndex: number) => {
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room?.roadmap) return state;
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: {
                                ...room,
                                currentUnitIndex: unitIndex,
                                currentSectionIndex: sectionIndex,
                            },
                        },
                    };
                });
                get().updateSectionStatus(roomId, unitIndex, sectionIndex, 'in_progress');
            },

            clearRoom: (roomId: string) => {
                set((state) => {
                    const { [roomId]: _, ...remainingRooms } = state.rooms;
                    return { rooms: remainingRooms };
                });
            },
        }),
        {
            name: 'managed-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
