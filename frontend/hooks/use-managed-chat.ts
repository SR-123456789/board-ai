'use client';

import { useCallback, useState } from 'react';
import { useManagedStore, Roadmap, Section } from './use-managed-store';
import { useChatStore, Message } from './use-chat-store';
import { useBoardStore } from './use-board-store';
import { v4 as uuidv4 } from 'uuid';

interface UseManagedChatReturn {
    sendMessage: (content: string) => Promise<void>;
    proceedToNextSection: (isCorrect: boolean) => Promise<void>;
    isLoading: boolean;
    currentPhase: string | null;
}

export function useManagedChat(roomId: string): UseManagedChatReturn {
    const [isLoading, setIsLoading] = useState(false);

    const managedState = useManagedStore((s) => s.rooms[roomId]);
    const { setPhaseForRoom, setHearingData, setRoadmapForRoom, advanceToNextSection, updateSectionStatus } = useManagedStore();
    const { addMessage, getMessages } = useChatStore();
    const { addNode } = useBoardStore();

    // 各エンドポイントへの直接呼び出し
    const callHearingGoal = useCallback(async (userLevel: string) => {
        const response = await fetch('/api/managed/hearing-goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userLevel }),
        });
        return response.json();
    }, []);

    const callGenerateRoadmap = useCallback(async (currentLevel: string, goal: string) => {
        const response = await fetch('/api/managed/generate-roadmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentLevel, goal }),
        });
        return response.json();
    }, []);

    const callTeachSection = useCallback(async (unitTitle: string, sectionTitle: string, goal: string, currentLevel: string) => {
        const response = await fetch('/api/managed/teach-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unitTitle, sectionTitle, goal, currentLevel }),
        });
        return response.json();
    }, []);

    const callAnswerQuestion = useCallback(async (question: string, sectionTitle: string, unitTitle: string, explanation: string) => {
        const response = await fetch('/api/managed/answer-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, sectionTitle, unitTitle, explanation }),
        });
        return response.json();
    }, []);

    const addAIMessage = useCallback((content: string, chatTurnId?: string) => {
        addMessage({
            id: uuidv4(),
            role: 'assistant',
            content,
            chatTurnId,
        });
    }, [addMessage]);

    const addUserMessage = useCallback((content: string) => {
        addMessage({
            id: uuidv4(),
            role: 'user',
            content,
        });
    }, [addMessage]);

    const sendMessage = useCallback(async (content: string) => {
        if (!managedState) return;

        setIsLoading(true);
        addUserMessage(content);

        try {
            const phase = managedState.phase;

            if (phase === 'hearing_level') {
                // ユーザーがレベル+目標を回答した（最初のメッセージ）
                setHearingData(roomId, { level: content });
                setPhaseForRoom(roomId, 'hearing_goal');

                // 目標を質問（ユーザーの回答をコンテキストとして渡す）
                const result = await callHearingGoal(content);
                if (result.type === 'text' && result.content) {
                    addAIMessage(result.content);
                } else {
                    addAIMessage('なるほど！では、この学習を通じて何ができるようになりたいですか？具体的な目標を教えてください。');
                }

            } else if (phase === 'hearing_goal') {
                // ユーザーが目標を回答した
                setHearingData(roomId, { goal: content });
                setPhaseForRoom(roomId, 'generating_roadmap');

                // ロードマップを生成
                const result = await callGenerateRoadmap(
                    managedState.hearingData.level || '',
                    content
                );

                if (result.type === 'tool_call' && result.tool === 'generate_roadmap') {
                    const roadmapData: Roadmap = {
                        goal: result.args.goal,
                        currentLevel: result.args.currentLevel,
                        units: result.args.units.map((u: any) => ({
                            id: u.id,
                            title: u.title,
                            sections: u.sections.map((s: any) => ({
                                id: s.id,
                                title: s.title,
                                status: 'pending' as const,
                                importance: 'normal' as const,
                            })),
                        })),
                    };

                    setRoadmapForRoom(roomId, roadmapData);

                    // 最初の節を開始
                    updateSectionStatus(roomId, 0, 0, 'in_progress');

                    // ロードマップ完了メッセージ
                    addAIMessage(`📚 学習ロードマップを作成しました！\n\n目標: ${roadmapData.goal}\n\n${roadmapData.units.length}つの単元、合計${roadmapData.units.reduce((s, u) => s + u.sections.length, 0)}つの節で構成されています。\n\nそれでは最初の節「${roadmapData.units[0].sections[0].title}」から始めましょう！`);

                    // 最初の解説を取得
                    await teachCurrentSection(roomId, roadmapData, 0, 0);
                }

            } else if (phase === 'learning') {
                // 学習中 - ユーザーの質問に回答
                const roadmap = managedState.roadmap!;
                const currentUnit = roadmap.units[managedState.currentUnitIndex];
                const currentSection = currentUnit.sections[managedState.currentSectionIndex];
                const turnId = uuidv4();

                // 質問に回答
                const result = await callAnswerQuestion(
                    content,
                    currentSection.title,
                    currentUnit.title,
                    currentSection.title // 実際には解説内容を保存して使うべき
                );

                if (result.type === 'text' && result.content) {
                    // ボードに質問への回答を追加
                    addNode({
                        type: 'text',
                        content: `## 💡 質問への回答\n\n**Q: ${content}**\n\n${result.content}`,
                        chatTurnId: turnId,
                        createdBy: 'ai',
                        sectionId: currentSection.id,
                    });

                    // チャットにも回答を表示
                    addAIMessage('💡 回答をボードに追加しました！続けて確認問題に回答して「次へ」ボタンで進んでください。', turnId);
                } else {
                    addAIMessage('ご質問ありがとうございます！もう少し具体的に教えていただけますか？');
                }
            }
        } catch (error) {
            console.error('Managed chat error:', error);
            addAIMessage('エラーが発生しました。もう一度お試しください。');
        } finally {
            setIsLoading(false);
        }
    }, [managedState, roomId, addUserMessage, addAIMessage, callHearingGoal, callGenerateRoadmap, setPhaseForRoom, setHearingData, setRoadmapForRoom, advanceToNextSection, updateSectionStatus, addNode]);

    const teachCurrentSection = async (roomId: string, roadmap: Roadmap, unitIdx: number, sectionIdx: number) => {
        const unit = roadmap.units[unitIdx];
        const section = unit.sections[sectionIdx];

        const result = await callTeachSection(
            unit.title,
            section.title,
            roadmap.goal,
            roadmap.currentLevel || ''
        );

        if (result.type === 'tool_call' && result.tool === 'teach_section') {
            const { explanation, practiceQuestion, chatMessage } = result.args;
            const turnId = uuidv4();

            // ボードに解説を追加
            addNode({
                type: 'text',
                content: `# ${section.title}\n\n${explanation}`,
                chatTurnId: turnId,
                createdBy: 'ai',
            });

            // ボードに確認問題を追加
            addNode({
                type: 'quiz',
                content: practiceQuestion.question,
                chatTurnId: turnId,
                createdBy: 'ai',
                sectionId: section.id, // この節のID
                quizData: {
                    question: practiceQuestion.question,
                    type: practiceQuestion.type,
                    options: practiceQuestion.options,
                    correctAnswer: practiceQuestion.correctAnswer,
                    keywords: practiceQuestion.keywords,
                    explanation: practiceQuestion.explanation,
                },
            });

            // チャットには短いメッセージのみ
            addAIMessage(chatMessage, turnId);
        }
    };

    // 次の節へ進む（QuizNodeの「次へ」ボタンから呼ばれる）
    const proceedToNextSection = useCallback(async (isCorrect: boolean) => {
        if (!managedState || managedState.phase !== 'learning') return;

        setIsLoading(true);
        try {
            const roadmap = managedState.roadmap!;

            // フィードバックメッセージ
            if (isCorrect) {
                addAIMessage('✅ 正解です！次の節に進みましょう。');
            } else {
                addAIMessage('💡 次の節に進みます。復習が必要なら後でやり直しましょう。');
            }

            // 現在の節を「完了」に更新
            updateSectionStatus(roomId, managedState.currentUnitIndex, managedState.currentSectionIndex, 'completed');

            // 次の節へ
            const hasNext = advanceToNextSection(roomId);
            if (hasNext) {
                const newState = useManagedStore.getState().rooms[roomId];
                // 次の節を「進行中」に更新
                updateSectionStatus(roomId, newState.currentUnitIndex, newState.currentSectionIndex, 'in_progress');
                await teachCurrentSection(
                    roomId,
                    newState.roadmap!,
                    newState.currentUnitIndex,
                    newState.currentSectionIndex
                );
            } else {
                setPhaseForRoom(roomId, 'completed');
                addAIMessage('🎉 おめでとうございます！すべての学習を完了しました！');
            }
        } catch (error) {
            console.error('Proceed error:', error);
            addAIMessage('エラーが発生しました。もう一度お試しください。');
        } finally {
            setIsLoading(false);
        }
    }, [managedState, roomId, advanceToNextSection, setPhaseForRoom, addAIMessage]);

    return {
        sendMessage,
        proceedToNextSection,
        isLoading,
        currentPhase: managedState?.phase || null,
    };
}
