import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvas.store';
import type { ImageBlock, CopyBlock as CopyBlockType, VideoBlock, AudioBlock, BriefBlock } from '../../types/content-blocks';

export const CanvasPanel: React.FC = () => {
    const { blocks } = useCanvasStore();

    const heroImage = blocks.find(b => b.type === 'image' && (b as ImageBlock).shot_type === 'hero') as ImageBlock | undefined;
    const heroCopy = blocks.find(b => b.type === 'copy') as CopyBlockType | undefined;
    const videoBlock = blocks.find(b => b.type === 'video') as VideoBlock | undefined;
    const audioBlock = blocks.find(b => b.type === 'audio') as AudioBlock | undefined;
    const briefBlock = blocks.find(b => b.type === 'brief') as BriefBlock | undefined;
    const extraImages = blocks.filter(b => b.type === 'image' && (b as ImageBlock).shot_type !== 'hero') as ImageBlock[];

    // Collect all downloadable assets
    const downloadableAssets: { url: string; filename: string }[] = [];
    if (heroImage?.signed_url) downloadableAssets.push({ url: heroImage.signed_url, filename: 'fluence-hero-image.jpg' });
    extraImages.forEach((img, i) => {
        if (img.signed_url) downloadableAssets.push({ url: img.signed_url, filename: `fluence-image-${i + 1}.jpg` });
    });
    if (videoBlock?.signed_url) downloadableAssets.push({ url: videoBlock.signed_url, filename: 'fluence-campaign-video.mp4' });
    if (audioBlock?.signed_url) downloadableAssets.push({ url: audioBlock.signed_url, filename: 'fluence-voiceover.mp3' });

    return (
        <div className="h-full w-full relative overflow-y-auto custom-scrollbar animate-fade-in">
            {/* Sticky header */}
            <div className="sticky top-0 z-30 px-8 py-5 flex justify-between items-center bg-background/80 backdrop-blur-md border-b border-white/5">
                <h2 className="text-lg font-semibold gradient-text tracking-wide">Live Canvas</h2>
                <div className="flex items-center gap-3">
                    {downloadableAssets.length > 0 && (
                        <DownloadAllButton assets={downloadableAssets} />
                    )}
                    {blocks.length > 0 && (
                        <button
                            id="clear-canvas-button"
                            onClick={() => useCanvasStore.getState().clearCanvas()}
                            className="text-xs text-gray-500 hover:text-white transition-colors uppercase tracking-wider font-semibold"
                            aria-label="Clear canvas"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {blocks.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-12 text-center">
                    <div className="w-24 h-24 rounded-full border border-primary/20 flex items-center justify-center animate-pulse-glow mb-6 bg-primary/5">
                        <svg className="w-10 h-10 text-primary-soft/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-medium text-white/80 mb-2">Awaiting Live Brief</h2>
                    <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                        Speak to the AI Director to generate a campaign. Assets will assemble here in real-time.
                    </p>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">
                {/* Hero section */}
                {(heroImage || heroCopy) && (
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black aspect-[21/9] group animate-slide-up">
                        {heroImage && (
                            <>
                                <img
                                    src={heroImage.signed_url}
                                    className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
                                    alt="Hero"
                                />
                                <AssetDownloadOverlay url={heroImage.signed_url} filename="fluence-hero-image.jpg" position="top-right" />
                            </>
                        )}
                        {heroCopy && (
                            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 bg-gradient-to-t from-black/90 via-black/30 to-transparent">
                                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight leading-tight">
                                    {heroCopy.headline}
                                </h1>
                                <p className="text-lg md:text-xl text-gray-300 max-w-2xl font-light mb-6">
                                    {heroCopy.body}
                                </p>
                                <div className="flex items-center gap-4">
                                    <button className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:scale-105 transition-transform text-sm">
                                        {heroCopy.cta}
                                    </button>
                                    {heroCopy.hashtags && heroCopy.hashtags.length > 0 && (
                                        <div className="hidden md:flex gap-2">
                                            {heroCopy.hashtags.slice(0, 3).map((tag, i) => (
                                                <span key={i} className="text-xs text-primary-soft/70">#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Copy card with copy-to-clipboard */}
                {heroCopy && (
                    <CopyCard block={heroCopy} />
                )}

                {/* Video */}
                {videoBlock && (
                    <VideoSection block={videoBlock} />
                )}

                {/* Audio player */}
                {audioBlock && (
                    <AudioSection block={audioBlock} />
                )}

                {/* Image grid */}
                {extraImages.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Additional Images</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {extraImages.map((img, i) => (
                                <div
                                    key={i}
                                    className="relative rounded-2xl overflow-hidden group cursor-pointer border border-white/5 animate-slide-up"
                                    style={{ animationDelay: `${250 + i * 80}ms` }}
                                >
                                    <img
                                        src={img.signed_url}
                                        className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                                        alt={img.shot_type}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                                        <p className="text-xs text-gray-300 line-clamp-2">{img.director_note}</p>
                                        <DownloadButton url={img.signed_url} filename={`fluence-image-${i + 1}.jpg`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Brief summary */}
                {briefBlock && (
                    <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '350ms' }}>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Campaign Brief</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <BriefStat label="Platform" value={briefBlock.platform} />
                            <BriefStat label="Voice" value={briefBlock.brand_voice} />
                            <BriefStat label="Hook" value={briefBlock.emotional_hook} />
                            <BriefStat label="Palette" value={briefBlock.color_palette_hint || '—'} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Copy Card with clipboard ─── */
const CopyCard: React.FC<{ block: CopyBlockType }> = ({ block }) => {
    const [copied, setCopied] = useState(false);
    const copyAll = () => {
        const text = `${block.headline}\n\n${block.body}\n\n${block.cta}\n\n${block.caption}\n\n${block.hashtags?.map(t => `#${t}`).join(' ') || ''}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-strong rounded-3xl p-8 animate-slide-up relative" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign Copy</h3>
                <button
                    onClick={copyAll}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        copied
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] hover:text-white'
                    }`}
                >
                    {copied ? (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                            Copy all
                        </>
                    )}
                </button>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">{block.headline}</h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-4">{block.body}</p>
            <p className="text-sm text-gray-500 mb-4 italic">{block.caption}</p>
            <div className="flex items-center gap-3 mb-4">
                <button className="px-6 py-3 bg-primary hover:bg-primary-soft text-white font-semibold rounded-full transition-colors text-sm">
                    {block.cta}
                </button>
            </div>
            {block.hashtags && block.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
                    {block.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs text-accent/60 bg-accent/5 px-2 py-0.5 rounded-md">#{tag}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Video Section ─── */
const VideoSection: React.FC<{ block: VideoBlock }> = ({ block }) => {
    if (!block.signed_url || block.status === 'processing') {
        return (
            <div className="glass-strong rounded-3xl p-8 flex items-center gap-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-breathe shrink-0">
                    <svg className="w-8 h-8 text-primary-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-medium text-white">Video is rendering…</p>
                    <p className="text-xs text-gray-500 mt-1">Cinematic clips typically take 1–2 minutes. Your video will appear here automatically.</p>
                    <div className="mt-3 h-1 w-48 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-primary-soft/50 rounded-full animate-shimmer" style={{ width: '60%' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (block.status === 'failed') {
        return (
            <div className="glass rounded-3xl p-6 border border-red-500/20 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center gap-3">
                    <span className="text-lg">⚠️</span>
                    <div>
                        <p className="text-sm font-medium text-red-400">Video generation failed</p>
                        <p className="text-xs text-gray-500 mt-0.5">The video couldn't be rendered. The rest of your campaign is ready.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/5 animate-slide-up relative group" style={{ animationDelay: '150ms' }}>
            <video
                src={block.signed_url}
                controls
                autoPlay
                loop
                muted
                className="w-full aspect-video object-cover bg-black"
            />
            <AssetDownloadOverlay url={block.signed_url} filename="fluence-campaign-video.mp4" position="top-right" />
        </div>
    );
};

/* ─── Audio Section ─── */
const AudioSection: React.FC<{ block: AudioBlock }> = ({ block }) => (
    <div className="glass-strong rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-200">Voiceover — {block.voice_persona}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{block.script}</p>
                </div>
            </div>
            <DownloadButton url={block.signed_url} filename={`fluence-voiceover-${block.voice_persona}.mp3`} />
        </div>
        <audio src={block.signed_url} controls className="w-full h-10" />
    </div>
);

/* ─── Download Button ─── */
const DownloadButton: React.FC<{ url: string; filename: string }> = ({ url, filename }) => {
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
            window.open(url, '_blank');
        }
    };
    return (
        <button
            onClick={handleDownload}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-gray-400 hover:text-white transition-all text-xs font-medium"
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
        </button>
    );
};

/* ─── Asset Download Overlay (for hero image/video) ─── */
const AssetDownloadOverlay: React.FC<{ url: string; filename: string; position: 'top-right' | 'bottom-right' }> = ({ url, filename, position }) => {
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
            window.open(url, '_blank');
        }
    };
    const posClass = position === 'top-right' ? 'top-3 right-3' : 'bottom-3 right-3';
    return (
        <button
            onClick={handleDownload}
            className={`absolute ${posClass} z-10 opacity-0 group-hover:opacity-100 transition-opacity p-2.5 rounded-xl glass-strong hover:bg-white/20`}
            title={`Download ${filename}`}
        >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
        </button>
    );
};

/* ─── Download All ─── */
const DownloadAllButton: React.FC<{ assets: { url: string; filename: string }[] }> = ({ assets }) => {
    const [downloading, setDownloading] = useState(false);

    const downloadAll = async () => {
        setDownloading(true);
        for (const asset of assets) {
            try {
                const resp = await fetch(asset.url);
                const blob = await resp.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = asset.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                // Small delay between downloads
                await new Promise(r => setTimeout(r, 400));
            } catch {
                // Skip failed
            }
        }
        setDownloading(false);
    };

    return (
        <button
            onClick={downloadAll}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary-soft text-xs font-semibold transition-all disabled:opacity-50"
        >
            {downloading ? (
                <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Downloading…
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download All ({assets.length})
                </>
            )}
        </button>
    );
};

const BriefStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm text-gray-300 capitalize truncate">{value}</p>
    </div>
);
