export type ContentBlockType =
    | 'narration' | 'image' | 'video' | 'copy'
    | 'audio' | 'brief' | 'status' | 'error'
    | 'user_message'
    | 'session_ready' | 'session_complete' | 'ping' | 'audio_response';

export interface NarrationBlock { type: 'narration'; text: string; streaming: boolean }
export interface ImageBlock { type: 'image'; signed_url: string; expanded_prompt: string; director_note: string; shot_type: string }
export interface VideoBlock { type: 'video'; signed_url: string | null; duration: number; status: 'ready' | 'processing' | 'failed' }
export interface CopyBlock { type: 'copy'; headline: string; body: string; cta: string; caption: string; hashtags: string[] }
export interface AudioBlock { type: 'audio'; signed_url: string; script: string; voice_persona: string }
export interface BriefBlock { type: 'brief'; platform: string; brand_voice: string; color_palette_hint: string; emotional_hook: string }
export interface StatusBlock { type: 'status'; message: string }
export interface ErrorBlock { type: 'error'; message: string; recoverable: boolean }
export interface UserMessageBlock { type: 'user_message'; text: string }
export interface AudioResponseBlock { type: 'audio_response'; data: string; mime_type: string }

export type ContentBlock =
    NarrationBlock | ImageBlock | VideoBlock | CopyBlock |
    AudioBlock | BriefBlock | StatusBlock | ErrorBlock | UserMessageBlock;
