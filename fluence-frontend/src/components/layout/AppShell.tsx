import React from 'react';
import { useSessionStore } from '../../store/session.store';
import { VoiceCapture } from '../controls/VoiceCapture';
import { ChatPanel } from './ChatPanel';
import { CanvasPanel } from './CanvasPanel';
import { signOutUser } from '../../services/firebase.service';

export const AppShell: React.FC = () => {
    const { status, user } = useSessionStore();

    return (
        <div className="flex h-screen w-screen bg-background overflow-hidden font-sans">
            {/* Ambient background gradient */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
            </div>

            {/* Left Column: Agent Console (Sleek Sidebar) */}
            <div className="relative z-10 w-[360px] flex-shrink-0 flex flex-col border-r border-white/5 bg-background/30 backdrop-blur-xl">
                
                {/* Status bar (Minimalist) */}
                <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <h1 className="text-sm font-black gradient-text tracking-tighter">FLUENCE</h1>
                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] hidden sm:inline-block">Studio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            status === 'connected' ? 'bg-emerald-500' :
                            status === 'generating' ? 'bg-primary-soft animate-pulse' :
                            status === 'error' ? 'bg-red-500' :
                            'bg-gray-600'
                        }`} />
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider hidden sm:inline-block">{status}</span>
                        {user && (
                            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-white/10">
                                <span className="text-[10px] text-gray-500 truncate max-w-[100px]" title={user.email || ''}>
                                    {user.email || 'User'}
                                </span>
                                <button 
                                    onClick={() => signOutUser()}
                                    className="text-[10px] text-gray-400 hover:text-white transition-colors"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Session Feed Area -> Now ChatPanel */}
                <div className="flex-1 overflow-hidden relative">
                    <ChatPanel />
                </div>

                {/* Input Area / Voice Orb Docked at Bottom */}
                <div className="flex-shrink-0 p-6 border-t border-white/5 bg-black/20 backdrop-blur-md relative z-20">
                    <VoiceCapture />
                </div>
            </div>

            {/* Right Column: Dynamic Canvas */}
            <main className="relative z-10 flex-1 h-full overflow-hidden bg-background">
                <CanvasPanel />
            </main>
        </div>
    );
};
