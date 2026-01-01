/**
 * API Route用の共通型定義
 */

import { MessagePart, Message } from '@/hooks/use-chat-store';
import { Roadmap, Section, Unit, ManagedRoomState } from '@/hooks/use-managed-store';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import type { Provider } from '@supabase/supabase-js';

// Re-export for convenience
export type { MessagePart, Message } from '@/hooks/use-chat-store';
export type { Roadmap, Section, Unit, ManagedRoomState } from '@/hooks/use-managed-store';

/**
 * チャットメッセージのpartsの型（API用）
 */
export interface ApiMessagePart {
    text?: string;
    fileData?: {
        fileUri: string;
        mimeType: string;
    };
}

/**
 * Gemini APIへ送信するメッセージの型
 */
export interface GeminiHistoryMessage {
    role: 'user' | 'model';
    parts: Array<{ text: string } | { fileData: { fileUri: string; mimeType: string } }>;
}

/**
 * DBから取得したRoom情報の型
 */
export interface ApiRoom {
    id: string;
    userId: string;
    title: string;
    updatedAt: Date;
    messages?: Array<{
        id: string;
        role: string;
        content: string;
        parts?: ApiMessagePart[] | string;
        chatTurnId?: string;
    }>;
    managedState?: {
        phase: string;
        roadmap?: Roadmap;
        currentUnitIndex: number;
        currentSectionIndex: number;
        hearingData?: Record<string, string>;
    };
}

/**
 * ボード操作の型
 */
export interface BoardOperation {
    action: 'create' | 'update' | 'delete';
    node: {
        id?: string;
        type: string;
        content: string;
        style?: {
            color?: string;
            backgroundColor?: string;
        };
    };
}

/**
 * generate_responseツールの引数型
 */
export interface GenerateResponseArgs {
    comment: string;
    operations: BoardOperation[];
    suggestedQuestions?: string[];
}

/**
 * Gemini関数呼び出しの引数型（汎用）
 */
export type GeminiFunctionArgs = GenerateResponseArgs | Record<string, unknown>;

/**
 * Gemini APIレスポンスのパーツ型
 */
export interface GeminiResponsePart {
    text?: string;
    functionCall?: {
        name: string;
        args: GeminiFunctionArgs;
    };
}

/**
 * ツール定義の型（Gemini API用）
 */
export interface GeminiToolDeclaration {
    functionDeclarations: Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    }>;
}

/**
 * ローカルストレージのmessage型（マイグレーション用）
 */
export interface LocalStorageMessage {
    id: string;
    role: string;
    content: string;
    parts?: ApiMessagePart[];
    chatTurnId?: string;
}

/**
 * ローカルストレージのチャットルームデータ型
 */
export interface LocalStorageChatRoom {
    messages: LocalStorageMessage[];
    suggestedQuestions?: string[];
    mode?: 'normal' | 'managed';
}

/**
 * ローカルストレージのボードデータ型
 */
export interface LocalStorageBoardData {
    nodes: Array<{
        id: string;
        type: string;
        content: string;
        [key: string]: unknown;
    }>;
}

/**
 * Supabaseのcookies setAll用の型
 */
export interface SupabaseCookieToSet {
    name: string;
    value: string;
    options?: Record<string, unknown>;
}

/**
 * OAuth Provider の型
 */
export type OAuthProvider = Provider;

/**
 * teach_sectionの結果型
 */
export interface TeachSectionResult {
    explanation: string;
    practiceQuestion: {
        question: string;
        type: 'choice' | 'freeform';
        options?: string[];
        correctAnswer?: number;
        keywords?: string[];
        explanation?: string;
    };
    chatMessage: string;
}

/**
 * generate_roadmapの結果型
 */
export interface GenerateRoadmapResult {
    goal: string;
    currentLevel: string;
    units: Array<{
        id: string;
        title: string;
        sections: Array<{
            id: string;
            title: string;
        }>;
    }>;
}
