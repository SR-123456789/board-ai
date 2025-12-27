export type NodeType = 'text' | 'sticky' | 'equation' | 'problem' | 'feedback' | 'worksheet';

export interface BoardNode {
    id: string;
    type: NodeType;
    content: string;
    position?: {
        x: number;
        y: number;
    };
    size?: {
        width: number;
        height: number;
    };
    style?: {
        color?: string;
        backgroundColor?: string;
        fontSize?: string;
    };
    createdAt?: number; // Timestamp when node was created
    chatTurnId?: string; // Groups nodes created in the same chat turn
    createdBy: 'user' | 'ai';
    canvasId?: string; // If we support multiple canvases later
}

export interface BoardState {
    id: string; // "default" for now
    nodes: BoardNode[];
    lastUpdated: number;
}
