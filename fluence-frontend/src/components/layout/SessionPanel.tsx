import React, { useRef, useEffect, useState } from 'react';
import { useSessionStore } from '../../store/session.store';
import type { ContentBlock, ImageBlock, CopyBlock as CopyBlockType, VideoBlock, AudioBlock, BriefBlock } from '../../types/content-blocks';

export const SessionFeed: React.FC = () => {
    const { feedBlocks, status } = useSessionStore();
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [feedBlocks, status]);

    return (
        <div className="h-full w-full flex flex-col p-6 overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-4">
                
                {/* Initial Empty State / System Welcome */}
                {feedBlocks.length === 0 && status !== 'generating' && (
                    <div className="animate-fade-in mt-4">
                        <div className="glass rounded-2xl px-5 py-4 border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xl">✨</span>
                                <h3 className="text-sm font-semibold text-white">Fluence Agent Initialized</h3>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                I am ready to be your live creative director. Tap the orb below and tell me about the campaign you want to build.
                            </p>
                        </div>
                    </div>
                )}

                {/* Feed Blocks */}
                {feedBlocks.map((block, idx) => (
                    <div
                        key={idx}
                        className="animate-slide-up"
                        style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
                    >
                        <FeedBubble block={block} />
                    </div>
                ))}

                {/* Generating Loading State */}
                {status === 'generating' && (
                    <div className="animate-slide-up mt-2">
                        <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-primary-soft rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-primary-soft rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-primary-soft rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-xs text-gray-500 font-medium tracking-wide">Synthesizing campaign components...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
};

const FeedBubble: React.FC<{ block: ContentBlock }> = ({ block }) => {
    // User message — right-aligned, distinct color
    if (block.type === 'user_message') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] bg-primary/20 border border-primary/30 rounded-2xl rounded-br-sm px-4 py-3">
                    <p className="text-sm text-white leading-relaxed">{block.text}</p>
                </div>
            </div>
        );
    }

    // AI narration — left-aligned with label
    if (block.type === 'narration') {
        return (
            <div className="flex justify-start">
                <div className="max-w-[90%]">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">F</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Fluence</span>
                    </div>
                    <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
                        <p className="text-sm text-gray-200 leading-relaxed">{block.text}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (block.type === 'status') {
        return (
            <div className="text-[11px] text-gray-600 italic text-center py-1">{block.message}</div>
        );
    }

    if (block.type === 'error') {
        return (
            <div className="glass rounded-2xl px-4 py-3 border-danger/20">
                <p className="text-xs text-red-400">{block.message}</p>
            </div>
        );
    }

    if (block.type === 'image') {
        return <InlineFeedImage block={block as ImageBlock} />;
    }

    if (block.type === 'copy') {
        return <InlineFeedCopy block={block as CopyBlockType} />;
    }

    if (block.type === 'video') {
        return <InlineFeedVideo block={block as VideoBlock} />;
    }

    if (block.type === 'audio') {
        return <InlineFeedAudio block={block as AudioBlock} />;
    }

    if (block.type === 'brief') {
        return <InlineFeedBrief block={block as BriefBlock} />;
    }

    return null;
};

/* ─── Inline Feed: Image ─── */
const InlineFeedImage: React.FC<{ block: ImageBlock }> = ({ block }) => (
    <div className="glass-strong rounded-2xl overflow-hidden">
        <img
            src={block.signed_url}
            alt={block.shot_type || 'Generated image'}
            className="w-full h-40 object-cover"
            loading="lazy"
        />
        <div className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
                <p className="text-xs font-medium text-primary-soft">🎨 Hero Image</p>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{block.director_note}</p>
            </div>
            <DownloadBtn url={block.signed_url} filename={`fluence-image-${block.shot_type}.jpg`} />
        </div>
    </div>
);

/* ─── Inline Feed: Copy ─── */
const InlineFeedCopy: React.FC<{ block: CopyBlockType }> = ({ block }) => {
    const [copied, setCopied] = useState(false);
    const copyAll = () => {
        const text = `${block.headline}\n\n${block.body}\n\n${block.cta}\n\n${block.caption}\n\n${block.hashtags?.map(t => `#${t}`).join(' ') || ''}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="glass-strong rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-primary-soft">✍️ Campaign Copy</p>
                <button onClick={copyAll} className="text-[10px] text-gray-500 hover:text-white transition-colors">
                    {copied ? '✓ Copied' : 'Copy all'}
                </button>
            </div>
            <p className="text-sm font-semibold text-white leading-snug">{block.headline}</p>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{block.body}</p>
            {block.hashtags && block.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {block.hashtags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="text-[10px] text-accent/70">#{tag}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Inline Feed: Video ─── */
const InlineFeedVideo: React.FC<{ block: VideoBlock }> = ({ block }) => {
    if (!block.signed_url || block.status === 'processing') {
        return (
            <div className="glass-strong rounded-2xl px-4 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-breathe">
                    <svg className="w-5 h-5 text-primary-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                </div>
                <div>
                    <p className="text-xs font-medium text-primary-soft">🎬 Video rendering…</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">This may take up to 2 minutes</p>
                </div>
            </div>
        );
    }
    return (
        <div className="glass-strong rounded-2xl overflow-hidden">
            <video
                src={block.signed_url}
                controls
                muted
                className="w-full h-36 object-cover bg-black"
            />
            <div className="px-4 py-2 flex items-center justify-between">
                <p className="text-xs font-medium text-primary-soft">🎬 Campaign Video — {block.duration}s</p>
                <DownloadBtn url={block.signed_url} filename="fluence-video.mp4" />
            </div>
        </div>
    );
};

/* ─── Inline Feed: Audio ─── */
const InlineFeedAudio: React.FC<{ block: AudioBlock }> = ({ block }) => (
    <div className="glass-strong rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                </div>
                <div>
                    <p className="text-xs font-medium text-primary-soft">🎙️ Voiceover — {block.voice_persona}</p>
                    <p className="text-[10px] text-gray-600 line-clamp-1">{block.script}</p>
                </div>
            </div>
            <DownloadBtn url={block.signed_url} filename={`fluence-voiceover-${block.voice_persona}.mp3`} />
        </div>
        <audio src={block.signed_url} controls className="w-full h-8 mt-1" />
    </div>
);

/* ─── Inline Feed: Brief ─── */
const InlineFeedBrief: React.FC<{ block: BriefBlock }> = ({ block }) => (
    <div className="glass-strong rounded-2xl px-4 py-3">
        <p className="text-xs font-medium text-primary-soft mb-2">📋 Campaign Brief</p>
        <div className="grid grid-cols-2 gap-2">
            <BriefChip label="Platform" value={block.platform} />
            <BriefChip label="Voice" value={block.brand_voice} />
            <BriefChip label="Hook" value={block.emotional_hook} />
            <BriefChip label="Palette" value={block.color_palette_hint || '—'} />
        </div>
    </div>
);

const BriefChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-white/[0.03] rounded-lg px-2.5 py-1.5">
        <p className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</p>
        <p className="text-[11px] text-gray-300 capitalize truncate mt-0.5">{value}</p>
    </div>
);

/* ─── Download Button ─── */
const DownloadBtn: React.FC<{ url: string; filename: string }> = ({ url, filename }) => {
    const handleDownload = async () => {
        try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch {
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };
    return (
        <button
            onClick={handleDownload}
            className="shrink-0 w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] transition-colors flex items-center justify-center group"
            title={`Download ${filename}`}
        >
            <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
        </button>
    );
};
