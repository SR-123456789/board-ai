'use client';

import { useCallback, useState } from 'react';
import { useManagedStore, Roadmap, Section, Unit } from './use-managed-store';
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
    const callHearingGoal = useCallback(async (userLevel: string, userMessageId: string) => {
        const response = await fetch('/api/managed/hearing-goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, userLevel, userMessageId }),
        });
        return response.json();
    }, [roomId]);

    const callGenerateRoadmap = useCallback(async (currentLevel: string, goal: string, userMessageId: string) => {
        const response = await fetch('/api/managed/generate-roadmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, currentLevel, goal, userMessageId }),
        });
        return response.json();
    }, [roomId]);

    const callTeachSection = useCallback(async (unitTitle: string, sectionTitle: string, goal: string, context: string, userMessageId: string) => {
        const response = await fetch('/api/managed/teach-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, unitTitle, sectionTitle, goal, context, userMessageId }),
        });
        return response.json();
    }, [roomId]);

    const callAnswerQuestion = useCallback(async (question: string, sectionTitle: string, unitTitle: string, explanation: string, userMessageId: string) => {
        const response = await fetch('/api/managed/answer-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, question, sectionTitle, unitTitle, explanation, userMessageId }),
        });
        return response.json();
    }, [roomId]);

    const addAIMessage = useCallback((content: string, id: string = uuidv4(), chatTurnId?: string) => {
        addMessage({
            id,
            role: 'assistant',
            content,
            chatTurnId,
        }, roomId); // Ensure roomId is passed
    }, [addMessage, roomId]);

    const addUserMessage = useCallback((content: string, id: string = uuidv4()) => {
        addMessage({
            id,
            role: 'user',
            content,
        }, roomId); // Ensure roomId is passed
    }, [addMessage, roomId]);

    const teachCurrentSection = useCallback(async (roomId: string, roadmap: Roadmap, unitIdx: number, sectionIdx: number) => {
        const unit = roadmap.units[unitIdx];
        const section = unit.sections[sectionIdx];

        // Create simple text representation of roadmap for context
        // e.g.
        // Unit 1: Title
        // - Section 1
        // - Section 2 (Current)
        // Create simple text representation of roadmap for context
        const context = roadmap.units.map((u: Unit, uIdx: number) =>
            `Unit ${uIdx + 1}: ${u.title}\n` +
            u.sections.map((s: Section, sIdx: number) =>
                (uIdx === unitIdx && sIdx === sectionIdx) ? `  - [現在の学習箇所] ${s.title}` : `  - ${s.title}`
            ).join('\n')
        ).join('\n');

        const result = await callTeachSection(
            unit.title,
            section.title,
            roadmap.goal,
            context,
            uuidv4()
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
    }, [callTeachSection, addNode, addAIMessage, updateSectionStatus]);

    const sendMessage = useCallback(async (content: string) => {
        if (!managedState) return;

        setIsLoading(true);
        const userMessageId = uuidv4();
        addUserMessage(content, userMessageId);

        try {
            const phase = managedState.phase;

            if (phase === 'hearing_level' || phase === 'hearing') {
                // ユーザーがレベル+目標を回答した（最初のメッセージ）
                setHearingData(roomId, { level: content });
                setPhaseForRoom(roomId, 'hearing_goal');

                // 目標を質問（ユーザーの回答をコンテキストとして渡す）
                const result = await callHearingGoal(content, userMessageId);
                if (result.type === 'text' && result.content) {
                    addAIMessage(result.content, result.aiMessageId);
                } else {
                    addAIMessage('なるほど！では、この学習を通じて何ができるようになりたいですか？具体的な目標を教えてください。');
                }

            } else if (phase === 'hearing_goal') {
                // ユーザーが目標を回答した
                setHearingData(roomId, { goal: content });

                // ロードマップ生成開始
                setPhaseForRoom(roomId, 'generating_roadmap');
                addAIMessage('ありがとうございます！学習プランを作成しています...少々お待ちください。');

                const currentLevel = managedState.hearingData.level || '初学者';
                const result = await callGenerateRoadmap(currentLevel, content, userMessageId);

                if (result.type === 'tool_call' && result.tool === 'generate_roadmap') {
                    const roadmap = result.args;
                    setRoadmapForRoom(roomId, roadmap);
                    setPhaseForRoom(roomId, 'proposal');

                    let message = '学習ロードマップを作成しました！\n\n';
                    message += `**目標**: ${roadmap.goal}\n`;
                    message += `**レベル**: ${roadmap.currentLevel}\n\n`;
                    message += 'この内容で進めてよろしいですか？「はい」と答えるか、修正したい点があれば教えてください。';

                    addAIMessage(message, result.aiMessageId);
                } else {
                    addAIMessage('申し訳ありません、ロードマップの作成に失敗しました。もう一度詳しく教えていただけますか？', result.aiMessageId);
                    setPhaseForRoom(roomId, 'hearing_goal');
                }

            } else if (phase === 'proposal') {
                // 提案への返答
                if (content.includes('はい') || content.includes('OK') || content.includes('大丈夫')) {
                    setPhaseForRoom(roomId, 'learning');
                    addAIMessage('では、学習を始めましょう！最初のセクションに進みます。');

                    // 最初のセクションの指導を開始
                    // 少し待ってから実行（UXのため）
                    setTimeout(async () => {
                        if (managedState.roadmap) {
                            await teachCurrentSection(roomId, managedState.roadmap, 0, 0);
                        }
                    }, 1000);

                } else {
                    // 修正要望
                    addAIMessage('承知しました。修正したいポイントを具体的に教えてください。');
                    // Implement modify logic later
                }

            } else if (phase === 'learning') {
                // 学習中の質問・回答
                const unit = managedState.roadmap?.units[managedState.currentUnitIndex];
                const section = unit?.sections[managedState.currentSectionIndex];

                if (unit && section) {
                    // 質問かどうか、練習問題の回答かどうか判定が必要
                    // ここでは単純に「質問・会話」としてAPIに投げる（Answer Question）
                    const res = await callAnswerQuestion(
                        content,
                        section.title,
                        unit.title,
                        section.description || '', // Description might be empty if not stored
                        userMessageId,
                    );

                    if (res.type === 'text') {
                        addAIMessage(res.content, res.aiMessageId);
                    }
                }
            }

        } catch (error) {
            console.error('Unified Chat Error:', error);
            addAIMessage('申し訳ありません、エラーが発生しました。もう一度お試しください。');
        } finally {
            setIsLoading(false);
        }
    }, [managedState, roomId, addUserMessage, addAIMessage, callHearingGoal, callGenerateRoadmap, callTeachSection, callAnswerQuestion, setHearingData, setPhaseForRoom, setRoadmapForRoom, addNode, teachCurrentSection]);



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
