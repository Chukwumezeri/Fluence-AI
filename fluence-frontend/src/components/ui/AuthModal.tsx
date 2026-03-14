import { useState } from 'react';
import { signInWithGoogle } from '../../services/firebase.service';

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    
    if (!isOpen) return null;

    const handleStart = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            onClose();
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 animate-fade-in">
            <div className="glass-strong p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 animate-slide-up border border-white/10">
                {/* Mini orb logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full animate-pulse-glow"
                        style={{
                            background: 'radial-gradient(circle at 35% 35%, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.2) 40%, rgba(6,182,212,0.15) 70%, transparent 100%)',
                            border: '1px solid rgba(129,140,248,0.2)',
                        }}
                    />
                </div>

                <h2 className="text-2xl font-bold text-center gradient-text mb-2">FLUENCE</h2>
                <p className="text-gray-400 text-center text-sm mb-8 leading-relaxed">
                    Your AI creative director. Speak your vision, watch it come to life.
                </p>

                <button
                    id="auth-continue-button"
                    onClick={handleStart}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-soft text-white font-semibold py-3.5 px-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {loading ? 'Signing in...' : 'Sign in with Google'}
                </button>

                <p className="text-[11px] text-gray-600 text-center mt-4">
                    Sign in to remember your conversations
                </p>
            </div>
        </div>
    );
};
