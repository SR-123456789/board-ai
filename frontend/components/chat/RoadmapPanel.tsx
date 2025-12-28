'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Target, Star, SkipForward, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Roadmap, Unit, Section, useManagedStore } from '@/hooks/use-managed-store';

interface RoadmapPanelProps {
    roomId: string;
}

export const RoadmapPanel: React.FC<RoadmapPanelProps> = ({ roomId }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const managedState = useManagedStore((s) => s.rooms[roomId]);
    const { goToSection, updateSectionImportance } = useManagedStore();

    if (!managedState?.roadmap) {
        return null;
    }

    const { roadmap, currentUnitIndex, currentSectionIndex, phase } = managedState;

    // Calculate progress
    const totalSections = roadmap.units.reduce((sum, u) => sum + u.sections.length, 0);
    const completedSections = roadmap.units.reduce(
        (sum, u) => sum + u.sections.filter((s) => s.status === 'completed').length,
        0
    );
    const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    const getStatusIcon = (status: Section['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'in_progress':
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'skipped':
                return <SkipForward className="w-4 h-4 text-neutral-400" />;
            default:
                return <Circle className="w-4 h-4 text-neutral-300" />;
        }
    };

    const toggleImportance = (e: React.MouseEvent, unitIdx: number, sectionIdx: number, current: Section['importance']) => {
        e.stopPropagation();
        const next: Section['importance'] = current === 'normal' ? 'focus' : current === 'focus' ? 'skip' : 'normal';
        updateSectionImportance(roomId, unitIdx, sectionIdx, next);
    };

    return (
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
            >
                <BookOpen className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-sm flex-1 text-left">学習ロードマップ</span>
                <span className="text-xs text-neutral-500">{progress}%</span>
                <div className="w-20 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                )}
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 max-h-[40vh] overflow-y-auto">
                    {/* Goal */}
                    <div className="flex items-start gap-2 text-sm">
                        <Target className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                        <div>
                            <span className="text-neutral-500">目標: </span>
                            <span className="text-neutral-700 dark:text-neutral-300">{roadmap.goal}</span>
                        </div>
                    </div>

                    {/* Units */}
                    <div className="space-y-3">
                        {roadmap.units.map((unit, unitIdx) => (
                            <div key={unit.id} className="space-y-1">
                                <div className="font-medium text-sm text-neutral-700 dark:text-neutral-300">
                                    {unitIdx + 1}. {unit.title}
                                </div>
                                <div className="pl-4 space-y-1">
                                    {unit.sections.map((section, sectionIdx) => {
                                        const isCurrent = unitIdx === currentUnitIndex && sectionIdx === currentSectionIndex;
                                        return (
                                            <div
                                                key={section.id}
                                                className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${isCurrent
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    : ''
                                                    } ${section.importance === 'skip' ? 'opacity-50 line-through' : ''}`}
                                            >
                                                {getStatusIcon(section.status)}
                                                <span className="flex-1">{section.title}</span>
                                                {section.importance === 'focus' && (
                                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                                )}
                                                <button
                                                    onClick={(e) => toggleImportance(e, unitIdx, sectionIdx, section.importance)}
                                                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 opacity-0 group-hover:opacity-100"
                                                    title={
                                                        section.importance === 'normal'
                                                            ? '重点的に学習'
                                                            : section.importance === 'focus'
                                                                ? 'スキップ'
                                                                : '通常に戻す'
                                                    }
                                                >
                                                    {section.importance === 'normal' && <Star className="w-3 h-3 text-neutral-400" />}
                                                    {section.importance === 'focus' && <SkipForward className="w-3 h-3 text-neutral-400" />}
                                                    {section.importance === 'skip' && <Circle className="w-3 h-3 text-neutral-400" />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Phase indicator */}
                    {phase === 'completed' && (
                        <div className="text-center py-2 text-sm text-green-600 dark:text-green-400 font-medium">
                            🎉 学習完了！
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
