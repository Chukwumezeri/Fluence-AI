import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../../store/session.store';
import { useBrandStore } from '../../store/brand.store';
import { wsService } from '../../services/websocket.service';
import { SessionFeed } from './SessionPanel';

export const ChatPanel: React.FC = () => {
    const [textInput, setTextInput] = useState('');
    const { status, user } = useSessionStore();
    const { brandId } = useBrandStore();
    const inputRef = useRef<HTMLInputElement>(null);

    const ensureConnection = () => {
        if (!user) return false;
        if (!wsService.isOpen() && status !== 'connecting') {
            wsService.connect(user.uid, brandId);
        }
        return true;
    };

    const sendTextMessage = () => {
        const msg = textInput.trim();
        if (!msg) return;
        if (!ensureConnection()) return;

        // Add user message to feed immediately
        useSessionStore.getState().addFeedBlock({
            type: 'user_message',
            text: msg,
        });

        if (wsService.isOpen()) {
            wsService.sendText(msg);
        } else {
            // Wait for connect
            setTimeout(() => {
                if (wsService.isOpen()) wsService.sendText(msg);
            }, 500);
        }
        setTextInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendTextMessage();
        }
    };

    // Auto-focus input when connected
    useEffect(() => {
        if (status === 'connected') {
            inputRef.current?.focus();
        }
    }, [status]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header info could go here if needed, but AppShell has one */}
            
            {/* Main Chat Feed */}
            <div className="flex-1 overflow-hidden">
                <SessionFeed />
            </div>

            {/* Chat Input Area */}
            <div className="p-4 border-t border-white/5">
                <div className={`glass rounded-xl flex items-center gap-2 px-3 py-2 transition-all duration-300 ${
                    status === 'connecting' ? 'opacity-50 pointer-events-none' : 'opacity-100'
                }`}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={status === 'connected' ? "Input brief..." : "..."}
                        className="flex-1 bg-transparent text-gray-300 text-xs placeholder:text-gray-700 outline-none"
                    />
                    <button
                        onClick={sendTextMessage}
                        disabled={!textInput.trim() || status === 'connecting'}
                        className="text-primary-soft hover:text-white disabled:opacity-30 transition-all"
                        aria-label="Send message"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
                
                {/* Secondary status or hints */}
                <div className="flex items-center justify-between mt-3 px-1">
                    <p className="text-[10px] text-gray-500 font-medium tracking-tight">
                        {status === 'generating' ? '✨ Director is thinking...' : 'Press Enter to send'}
                    </p>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] text-gray-600">Audio is live</span>
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
};
