export type MicPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

export class AudioService {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;

    async checkPermission(): Promise<MicPermission> {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            return result.state as MicPermission;
        } catch {
            return 'unknown';
        }
    }

    async startRecording(onData: (b64: string) => void) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioContextClass({ sampleRate: 16000 });
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = this.floatTo16BitPCM(inputData);
            const base64 = this.arrayBufferToBase64(pcmData);
            onData(base64);
        };

        this.source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
    }

    stopRecording() {
        if (this.processor) { this.processor.disconnect(); this.processor = null; }
        if (this.source) { this.source.disconnect(); this.source = null; }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }
        if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }
    }

    // Playback state
    private playbackContext: AudioContext | null = null;
    private nextPlayTime: number = 0;

    private initPlaybackContext() {
        if (!this.playbackContext) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            this.playbackContext = new AudioContextClass({ sampleRate: 16000 });
            this.nextPlayTime = this.playbackContext.currentTime;
        }
    }

    async playBase64Audio(base64Audio: string, mimeType: string = 'audio/pcm;rate=16000') {
        try {
            this.initPlaybackContext();
            const ctx = this.playbackContext!;

            // Make sure nextPlayTime is not in the past
            if (this.nextPlayTime < ctx.currentTime) {
                this.nextPlayTime = ctx.currentTime;
            }

            if (mimeType.includes('audio/pcm')) {
                const binaryStr = atob(base64Audio);
                const len = binaryStr.length;
                const pcm16 = new Int16Array(len / 2);
                
                let bsIndex = 0;
                for (let i = 0; i < pcm16.length; i++) {
                    const lsb = binaryStr.charCodeAt(bsIndex++);
                    const msb = binaryStr.charCodeAt(bsIndex++) << 8;
                    const val = msb | lsb;
                    pcm16[i] = val > 32767 ? val - 65536 : val;
                }

                const buffer = ctx.createBuffer(1, pcm16.length, 16000);
                const channelData = buffer.getChannelData(0);
                
                for (let i = 0; i < pcm16.length; i++) {
                    channelData[i] = pcm16[i] / 32768.0;
                }

                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                // Schedule this buffer to play at nextPlayTime
                source.start(this.nextPlayTime);
                this.nextPlayTime += buffer.duration;
            } else {
                // Not ideal for streaming MP3s but left as fallback
                const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
                audio.play();
            }
        } catch (e) {
            console.error('[Fluence] Audio playback failed:', e);
        }
    }

    private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < float32Array.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

export const audioService = new AudioService();
