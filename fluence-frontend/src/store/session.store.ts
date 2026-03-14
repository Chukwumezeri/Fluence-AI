import { create } from 'zustand';
import type { ContentBlock } from '../types/content-blocks';
import type { User } from 'firebase/auth';

export type SessionStatus =
    'idle' | 'connecting' | 'connected' | 'generating' | 'complete' | 'error' | 'disconnected';

interface SessionState {
    status: SessionStatus;
    sessionId: string | null;
    feedBlocks: ContentBlock[];
    isRecording: boolean;
    user: User | null;
    voice: string;
    speed: string;
    setStatus: (s: SessionStatus) => void;
    setSessionId: (id: string) => void;
    addFeedBlock: (b: ContentBlock) => void;
    appendNarration: (b: import('../types/content-blocks').NarrationBlock) => void;
    setRecording: (r: boolean) => void;
    setUser: (u: User | null) => void;
    setVoice: (v: string) => void;
    setSpeed: (s: string) => void;
    reset: () => void;
}

export const useSessionStore = create<SessionState>(set => ({
    status: 'idle', 
    sessionId: localStorage.getItem('fluence_session_id'), 
    feedBlocks: [], isRecording: false, user: null,
    voice: 'Aoede', speed: 'normal',
    setStatus: s => set({ status: s }),
    setSessionId: id => {
        localStorage.setItem('fluence_session_id', id);
        set({ sessionId: id });
    },
    addFeedBlock: b => set(s => ({ feedBlocks: [...s.feedBlocks, b] })),
    appendNarration: b => set(s => {
        const blocks = [...s.feedBlocks];
        const last = blocks[blocks.length - 1];
        if (last && last.type === 'narration' && (last as any).streaming) {
            // Append to existing streaming narration block
            last.text += b.text;
            (last as any).streaming = b.streaming;
            return { feedBlocks: blocks };
        }
        return { feedBlocks: [...blocks, b] };
    }),
    setRecording: r => set({ isRecording: r }),
    setUser: u => set({ user: u }),
    setVoice: v => set({ voice: v }),
    setSpeed: s => set({ speed: s }),
    reset: () => {
        localStorage.removeItem('fluence_session_id');
        set({ status: 'idle', sessionId: null, feedBlocks: [], isRecording: false });
    },
}));
