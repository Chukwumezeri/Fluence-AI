import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { useSessionStore } from "../store/session.store";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
};

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your-key') {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
    }
} catch (e) {
    console.warn('[Auth] Firebase init failed:', e);
}

export { auth };

export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase auth not initialized");
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('[Auth] Google sign-in failed:', error);
        throw error;
    }
};

export const signOutUser = async () => {
    if (!auth) return;
    await signOut(auth);
    useSessionStore.getState().reset();
    useSessionStore.getState().setUser(null);
};

export const initAuth = () => {
    if (!auth) {
        console.warn('[Auth] No Firebase config available');
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('[Auth] Signed in as:', user.displayName || user.email);
            useSessionStore.getState().setUser(user);
        } else {
            console.log('[Auth] User signed out');
            useSessionStore.getState().setUser(null);
        }
    });
};
