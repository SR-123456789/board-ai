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
    createdBy: 'user' | 'ai';
    canvasId?: string; // If we support multiple canvases later
}

export interface BoardState {
    id: string; // "default" for now
    nodes: BoardNode[];
    lastUpdated: number;
}
