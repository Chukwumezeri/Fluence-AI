import { create } from 'zustand';
import type { ContentBlock } from '../types/content-blocks';

const CANVAS_TYPES = new Set(['image', 'video', 'copy', 'audio', 'brief']);

interface CanvasState {
    blocks: ContentBlock[];
    campaignId: string | null;
    addBlock: (b: ContentBlock) => void;
    clearCanvas: () => void;
    setCampaignId: (id: string) => void;
}

export const useCanvasStore = create<CanvasState>(set => ({
    blocks: [], campaignId: null,
    addBlock: b => {
        if (CANVAS_TYPES.has(b.type))
            set(s => ({ blocks: [...s.blocks, b] }));
    },
    clearCanvas: () => set({ blocks: [], campaignId: null }),
    setCampaignId: id => set({ campaignId: id }),
}));
