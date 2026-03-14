import React, { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '../../store/session.store';
import { useBrandStore } from '../../store/brand.store';
import { wsService } from '../../services/websocket.service';
import { audioService, type MicPermission } from '../../services/audio.service';

export const VoiceCapture: React.FC = () => {
    const { isRecording, setRecording, status, user, voice, speed, setVoice, setSpeed } = useSessionStore();
    const { brandId } = useBrandStore();
    const [micPermission, setMicPermission] = useState<MicPermission>('unknown');

    useEffect(() => {
        audioService.checkPermission().then(setMicPermission);
        wsService.onAudioResponse((b64, mimeType) => {
            audioService.playBase64Audio(b64, mimeType);
        });
        return () => { audioService.stopRecording(); };
    }, []);

    // Auto-connect when user becomes available
    useEffect(() => {
        if (user && !wsService.isOpen() && status === 'idle') {
            console.log('[Fluence] User authenticated, connecting WebSocket...');
            wsService.connect(user.uid, brandId);
        }
    }, [user, brandId, status]);

    const ensureConnection = useCallback(() => {
        if (!user) {
            console.warn('[Fluence] No user yet — cannot connect');
            return false;
        }
        if (!wsService.isOpen() && status !== 'connecting') {
            console.log('[Fluence] Connecting WebSocket...');
            wsService.connect(user.uid, brandId);
        }
        return true;
    }, [user, status, brandId]);

    const toggleRecording = async () => {
        if (!ensureConnection()) return;

        if (isRecording) {
            audioService.stopRecording();
            setRecording(false);
        } else {
            try {
                await audioService.startRecording((b64) => {
                    wsService.sendAudio(b64);
                });
                setRecording(true);
                setMicPermission('granted');
                console.log('[Fluence] Recording started');
            } catch (err) {
                console.error('[Fluence] Mic access failed:', err);
                setMicPermission('denied');
            }
        }
    };

    const getStatusText = () => {
        if (isRecording) return 'Listening...';
        if (status === 'connecting') return 'Connecting...';
        if (status === 'generating') return 'Creating...';
        if (status === 'connected') return 'Audio active — Tap level to speak';
        if (micPermission === 'denied') return 'Mic access denied — enable in browser';
        return 'Ready';
    };

    const restartSession = () => {
        if (wsService.isOpen()) {
            wsService.endSession();
        }
        useSessionStore.getState().reset();
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            {/* Settings & Restart */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs mb-2">
                <div className="flex items-center gap-1.5">
                    <label className="text-gray-500 font-medium">Voice:</label>
                    <select 
                        value={voice} 
                        onChange={(e) => setVoice(e.target.value)}
                        className="bg-transparent border border-white/10 rounded px-2 py-1 text-gray-300 outline-none hover:border-white/30 transition-colors"
                    >
                        <option value="Puck" className="bg-[#121212]">Puck</option>
                        <option value="Aoede" className="bg-[#121212]">Aoede</option>
                        <option value="Charon" className="bg-[#121212]">Charon</option>
                        <option value="Kore" className="bg-[#121212]">Kore</option>
                        <option value="Fenrir" className="bg-[#121212]">Fenrir</option>
                    </select>
                </div>
                <div className="flex items-center gap-1.5">
                    <label className="text-gray-500 font-medium">Speed:</label>
                    <select 
                        value={speed} 
                        onChange={(e) => setSpeed(e.target.value)}
                        className="bg-transparent border border-white/10 rounded px-2 py-1 text-gray-300 outline-none hover:border-white/30 transition-colors"
                    >
                        <option value="normal" className="bg-[#121212]">Normal</option>
                        <option value="fast" className="bg-[#121212]">Fast</option>
                    </select>
                </div>
                <button 
                    onClick={restartSession}
                    className="ml-2 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    title="Start a fresh conversation"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    New Session
                </button>
            </div>
            
            {/* Action Orb */}
            <div className="relative flex items-center justify-center">
                <button
                    id="voice-orb-button"
                    onClick={toggleRecording}
                    disabled={status === 'connecting'}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 
                        ${isRecording ? 'bg-red-500/20 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 
                          status === 'generating' ? 'bg-primary/20 text-primary-soft shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-pulse' : 
                          'bg-white/5 text-white/70 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    {isRecording ? (
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                    ) : (
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                    )}
                </button>
                {/* Active recording rings */}
                {isRecording && (
                    <>
                        <div className="absolute inset-0 rounded-full border border-red-500/50 animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="absolute -inset-4 rounded-full bg-red-500/10 blur-xl animate-pulse" />
                    </>
                )}
            </div>

            {/* Status text */}
            <p className="text-[11px] text-gray-500 font-medium tracking-wide animate-fade-in">
                {getStatusText()}
            </p>
        </div>
    );
};
