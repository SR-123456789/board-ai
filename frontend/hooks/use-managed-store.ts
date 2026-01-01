import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useBoardStore } from './use-board-store';
import { v4 as uuidv4 } from 'uuid';

export type Phase = 'hearing' | 'hearing_level' | 'hearing_goal' | 'generating_roadmap' | 'proposal' | 'learning' | 'review' | 'completed';

export interface Section {
    id: string;
    title: string;
    description: string;
    goal: string;
    keywords: string[];
    status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
    importance?: 'normal' | 'focus' | 'skip';
}

export interface Unit {
    id: string;
    title: string;
    sections: Section[];
}

export interface Roadmap {
    title?: string;
    goal: string;
    currentLevel?: string;
    units: Unit[];
}

interface HearingData {
    goal?: string;
    level?: string;
    interest?: string;
    style?: string;
}

export interface ManagedRoomState {
    phase: Phase;
    roadmap: Roadmap | null;
    currentUnitIndex: number;
    currentSectionIndex: number;
    hearingData: HearingData;
    lastUpdated: number;
}

interface ManagedStore {
    rooms: { [roomId: string]: ManagedRoomState };
    currentRoomId: string | null;

    setCurrentRoom: (roomId: string) => void;
    fetchManagedState: (roomId: string) => Promise<void>;

    // Getters for current room
    getPhase: () => Phase;
    getRoadmap: () => Roadmap | null;
    getCurrentUnitIndex: () => number;
    getCurrentSectionIndex: () => number;

    // Actions (legacy - uses currentRoomId)
    setPhase: (phase: Phase) => void;
    setRoadmap: (roadmap: Roadmap) => void;
    updateHearingData: (data: Partial<HearingData>) => void;
    getHearingData: () => HearingData;

    // Actions (new - with roomId)
    setHearingData: (roomId: string, data: Partial<HearingData>) => void;
    setPhaseForRoom: (roomId: string, phase: Phase) => void;
    setRoadmapForRoom: (roomId: string, roadmap: Roadmap) => void;
    advanceToNextSection: (roomId: string) => boolean;
    updateSectionStatus: (roomId: string, unitIdx: number, sectionIdx: number, status: Section['status']) => void;

    nextSection: () => void;
    prevSection: () => void;
    isFirstSection: () => boolean;
    isLastSection: () => boolean;

    goToSection: (roomId: string, unitIdx: number, sectionIdx: number) => void;
    updateSectionImportance: (roomId: string, unitIdx: number, sectionIdx: number, importance: Section['importance']) => void;

    reset: () => void;
    clearRoom: (roomId: string) => void;
    initializeRoom: (roomId: string) => void;
}

const initialRoomState: ManagedRoomState = {
    phase: 'hearing',
    roadmap: null,
    currentUnitIndex: 0,
    currentSectionIndex: 0,
    hearingData: {},
    lastUpdated: Date.now()
};

const saveToServer = async (roomId: string, state: ManagedRoomState) => {
    try {
        await fetch(`/api/rooms/${roomId}/managed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state })
        });
    } catch (e) {
        console.error("Failed to save managed state", e);
    }
};

export const useManagedStore = create<ManagedStore>()(
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
                                [roomId]: { ...initialRoomState }
                            }
                        };
                    }
                    return { currentRoomId: roomId };
                });
                get().fetchManagedState(roomId);
            },

            fetchManagedState: async (roomId) => {
                try {
                    const res = await fetch(`/api/rooms/${roomId}`);
                    if (res.ok) {
                        const { room } = await res.json();
                        if (room && room.managedState) {
                            // ManagedState from DB might need mapping if field names differ, but we used same structure in creating schema?
                            // Schema: phase, roadmap (Json), hearingData (Json), indices.
                            // Prisma returns JSON as objects, so it should match nicely.
                            const dbState = room.managedState;

                            set((state) => ({
                                rooms: {
                                    ...state.rooms,
                                    [roomId]: {
                                        ...initialRoomState, // Default values
                                        ...state.rooms[roomId], // Keep local if newer? No, server authorative on load.
                                        phase: dbState.phase as Phase,
                                        roadmap: dbState.roadmap as Roadmap,
                                        currentUnitIndex: dbState.currentUnitIndex,
                                        currentSectionIndex: dbState.currentSectionIndex,
                                        hearingData: dbState.hearingData as HearingData,
                                        lastUpdated: Date.now()
                                    }
                                }
                            }));
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch managed state", e);
                }
            },

            initializeRoom: (roomId) =>
                set((state) => {
                    const newState = { ...initialRoomState };
                    saveToServer(roomId, newState);
                    return {
                        rooms: {
                            ...state.rooms,
                            [roomId]: newState
                        }
                    };
                }),

            getPhase: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId || !rooms[currentRoomId]) return 'hearing';
                return rooms[currentRoomId].phase;
            },

            getRoadmap: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId) return null;
                return rooms[currentRoomId]?.roadmap || null;
            },

            getCurrentUnitIndex: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId) return 0;
                return rooms[currentRoomId]?.currentUnitIndex || 0;
            },

            getCurrentSectionIndex: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId) return 0;
                return rooms[currentRoomId]?.currentSectionIndex || 0;
            },

            // Actions with Save Side Effect
            setPhase: (phase) =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const newState = {
                        ...state.rooms[roomId],
                        phase,
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            setRoadmap: (roadmap) =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const newState = {
                        ...state.rooms[roomId],
                        roadmap,
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            updateHearingData: (data) =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const current = state.rooms[roomId]?.hearingData || {};
                    const newState = {
                        ...state.rooms[roomId],
                        hearingData: { ...current, ...data },
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            getHearingData: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId) return {};
                return rooms[currentRoomId]?.hearingData || {};
            },

            // New roomId-based methods for use-managed-chat
            setHearingData: (roomId, data) =>
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room) return state;

                    const newState = {
                        ...room,
                        hearingData: { ...room.hearingData, ...data },
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            setPhaseForRoom: (roomId, phase) =>
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room) return state;

                    const newState = { ...room, phase, lastUpdated: Date.now() };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            setRoadmapForRoom: (roomId, roadmap) =>
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room) return state;

                    const newState = {
                        ...room,
                        roadmap,
                        phase: 'learning' as Phase,
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            advanceToNextSection: (roomId) => {
                const state = get();
                const room = state.rooms[roomId];
                if (!room || !room.roadmap) return false;

                const units = room.roadmap.units;
                let unitIdx = room.currentUnitIndex;
                let sectionIdx = room.currentSectionIndex + 1;

                // Check if we need to advance to next unit
                if (sectionIdx >= units[unitIdx].sections.length) {
                    unitIdx++;
                    sectionIdx = 0;
                }

                // Check if we've completed all
                if (unitIdx >= units.length) {
                    return false;
                }

                const newState = {
                    ...room,
                    currentUnitIndex: unitIdx,
                    currentSectionIndex: sectionIdx,
                    lastUpdated: Date.now()
                };
                saveToServer(roomId, newState);

                set((s) => ({
                    rooms: { ...s.rooms, [roomId]: newState }
                }));

                return true;
            },

            updateSectionStatus: (roomId, unitIdx, sectionIdx, status) =>
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room || !room.roadmap) return state;

                    const newUnits = [...room.roadmap.units];
                    const newSections = [...newUnits[unitIdx].sections];
                    newSections[sectionIdx] = {
                        ...newSections[sectionIdx],
                        status
                    };
                    newUnits[unitIdx] = { ...newUnits[unitIdx], sections: newSections };

                    const newState = {
                        ...room,
                        roadmap: { ...room.roadmap, units: newUnits },
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            nextSection: () =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const room = state.rooms[roomId];
                    if (!room || !room.roadmap) return state;

                    let nextUnit = room.currentUnitIndex;
                    let nextSection = room.currentSectionIndex + 1;

                    if (nextSection >= room.roadmap.units[room.currentUnitIndex].sections.length) {
                        nextUnit++;
                        nextSection = 0;
                    }

                    if (nextUnit < room.roadmap.units.length) {
                        const newState = {
                            ...room,
                            currentUnitIndex: nextUnit,
                            currentSectionIndex: nextSection,
                            lastUpdated: Date.now()
                        };
                        saveToServer(roomId, newState);
                        return { rooms: { ...state.rooms, [roomId]: newState } };
                    }
                    return state;
                }),

            prevSection: () =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const room = state.rooms[roomId];
                    if (!room || !room.roadmap) return state;

                    let prevUnit = room.currentUnitIndex;
                    let prevSection = room.currentSectionIndex - 1;

                    if (prevSection < 0) {
                        prevUnit--;
                        if (prevUnit >= 0) {
                            prevSection = room.roadmap.units[prevUnit].sections.length - 1;
                        } else {
                            // Already at start
                            return state;
                        }
                    }

                    const newState = {
                        ...room,
                        currentUnitIndex: prevUnit,
                        currentSectionIndex: prevSection,
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);
                    return { rooms: { ...state.rooms, [roomId]: newState } };
                }),

            isFirstSection: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId) return true;
                const room = rooms[currentRoomId];
                return room?.currentUnitIndex === 0 && room?.currentSectionIndex === 0;
            },

            isLastSection: () => {
                const { rooms, currentRoomId } = get();
                if (!currentRoomId) return true;
                const room = rooms[currentRoomId];
                if (!room?.roadmap) return true;
                const lastUnitIdx = room.roadmap.units.length - 1;
                const lastSectionIdx = room.roadmap.units[lastUnitIdx].sections.length - 1;
                return room.currentUnitIndex === lastUnitIdx && room.currentSectionIndex === lastSectionIdx;
            },

            reset: () =>
                set((state) => {
                    const roomId = state.currentRoomId;
                    if (!roomId) return state;

                    const newState = { ...initialRoomState };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            clearRoom: (roomId) =>
                set((state) => ({
                    rooms: {
                        ...state.rooms,
                        [roomId]: { ...initialRoomState }
                    }
                })),

            goToSection: (roomId, unitIdx, sectionIdx) =>
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room) return state;

                    const newState = {
                        ...room,
                        currentUnitIndex: unitIdx,
                        currentSectionIndex: sectionIdx,
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),

            updateSectionImportance: (roomId, unitIdx, sectionIdx, importance) =>
                set((state) => {
                    const room = state.rooms[roomId];
                    if (!room || !room.roadmap) return state;

                    const newUnits = [...room.roadmap.units];
                    const newSections = [...newUnits[unitIdx].sections];
                    newSections[sectionIdx] = {
                        ...newSections[sectionIdx],
                        importance
                    };
                    newUnits[unitIdx] = { ...newUnits[unitIdx], sections: newSections };

                    const newState = {
                        ...room,
                        roadmap: { ...room.roadmap, units: newUnits },
                        lastUpdated: Date.now()
                    };
                    saveToServer(roomId, newState);

                    return {
                        rooms: { ...state.rooms, [roomId]: newState }
                    };
                }),
        }),
        {
            name: 'managed-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
