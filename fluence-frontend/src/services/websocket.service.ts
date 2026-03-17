import { useSessionStore } from '../store/session.store';
import { useCanvasStore } from '../store/canvas.store';
import type { ContentBlock } from '../types/content-blocks';

type AudioCb = (b64: string, mimeType: string) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private retries: number = 0;
    private readonly max: number = 5;
    private audioCb: AudioCb | null = null;
    private lastConnectTime: number = 0;

    connect(userId: string, brandId?: string | null): void {
        const url = new URL(`${import.meta.env.VITE_BACKEND_WS_URL}/session`);
        url.searchParams.set('user_id', userId);
        if (brandId) url.searchParams.set('brand_id', brandId);
        const { voice, speed, sessionId } = useSessionStore.getState();
        url.searchParams.set('voice', voice);
        url.searchParams.set('speed', speed);
        if (sessionId) {
            url.searchParams.set('session_id', sessionId);
        }

        console.log('[WS] Connecting to:', url.toString());
        useSessionStore.getState().setStatus('connecting');
        this.ws = new WebSocket(url.toString());

        this.ws.onopen = () => {
            console.log('[WS] Connected');
            useSessionStore.getState().setStatus('connected');
            this.lastConnectTime = Date.now();
        };
        this.ws.onclose = (e) => {
            console.log('[WS] Closed:', e.code, e.reason);
            useSessionStore.getState().setStatus('disconnected');
            // If the connection dropped within 3 seconds, count it as a rapid failure
            if (Date.now() - this.lastConnectTime > 3000) {
                this.retries = 0;
            }
            this.retry(userId, brandId);
        };
        this.ws.onerror = (e) => {
            console.error('[WS] Error:', e);
            useSessionStore.getState().setStatus('error');
        };
        this.ws.onmessage = ({ data }) => {
            console.log('[WS] Message:', data);
            const msg = JSON.parse(data) as Record<string, unknown>;
            this.handle(msg);
        };
    }

    private handle(msg: Record<string, unknown>): void {
        if (msg.type === 'session_ready') {
            useSessionStore.getState().setSessionId(msg.session_id as string);
            return;
        }
        if (msg.type === 'session_complete') {
            useSessionStore.getState().setStatus('complete');
            return;
        }
        if (msg.type === 'audio_response' && this.audioCb) {
            this.audioCb(msg.data as string, msg.mime_type as string);
            return;
        }
        const block = msg as unknown as ContentBlock;
        
        if (block.type === 'narration' || block.type === 'user_message') {
            if (block.type === 'narration') {
                useSessionStore.getState().appendNarration(block);
            } else {
                useSessionStore.getState().addFeedBlock(block);
            }
            useSessionStore.getState().setStatus('generating');
            this.scheduleIdleReset();
            return;
        }

        useSessionStore.getState().addFeedBlock(block);
        useCanvasStore.getState().addBlock(block);

        if (['image', 'copy', 'video', 'audio', 'brief'].includes(msg.type as string)) {
            useSessionStore.getState().setStatus('generating');
            this.scheduleIdleReset();
        }
        if (msg.type === 'error') {
            useSessionStore.getState().setStatus('error');
        }
    }

    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private scheduleIdleReset() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            if (useSessionStore.getState().status === 'generating') {
                useSessionStore.getState().setStatus('connected');
            }
        }, 5000); // 5s of no new blocks = back to resting 'connected' state
    }

    sendAudio(b64: string): void { this.send({ type: 'audio_chunk', data: b64 }); }
    sendText(text: string): void { 
        this.send({ type: 'text_input', text }); 
        useSessionStore.getState().addFeedBlock({ type: 'user_message', text });
    }
    endSession(): void { this.send({ type: 'session_end' }); }
    onAudioResponse(cb: AudioCb): void { this.audioCb = cb; }
    isOpen(): boolean { return this.ws?.readyState === WebSocket.OPEN; }

    private send(data: object): void {
        if (this.isOpen()) this.ws!.send(JSON.stringify(data));
    }
    private retry(userId: string, brandId?: string | null): void {
        if (this.retries >= this.max) return;
        const delay = Math.min(30, Math.pow(2, this.retries)) * 1000;
        this.retries++;
        console.log(`[WS] Reconnecting in ${delay}ms (Attempt ${this.retries})`);
        setTimeout(() => this.connect(userId, brandId), delay);
    }
}

export const wsService = new WebSocketService();
