import { useEffect, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { AuthModal } from './components/ui/AuthModal';
import { initAuth } from './services/firebase.service';
import { useSessionStore } from './store/session.store';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useSessionStore();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!user) {
      t = setTimeout(() => setShowAuth(true), 1000);
    } else {
      t = setTimeout(() => setShowAuth(false), 0);
    }
    return () => { if (t !== undefined) clearTimeout(t); };
  }, [user]);

  return (
    <>
      <AppShell />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

export default App;
