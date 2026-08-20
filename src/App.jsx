// ===== Application Root =====
import { useEffect } from 'react';
import { StoreProvider, useStore, ACTIONS } from './store';
import { loadMemories, loadSettings } from './services/memoryService';

// Layout & Navigation Components
import ParticleBackground from './components/common/ParticleBackground';
import Navigation from './components/common/Navigation';
import ToastContainer from './components/common/ToastContainer';
import AuthGateway from './components/auth/AuthGateway';

// Views
import HomePage from './components/views/HomePage';
import CreateMemory from './components/memory/CreateMemory';
import AdminPanel from './components/views/AdminPanel';

// Supabase Auth Listener
import { isSupabaseConfigured, onAuthStateChange } from './services/supabaseClient';

function AppContent() {
  const { state, dispatch, loginUser } = useStore();

  // Listen to Supabase auth changes (Google OAuth redirect & session restore)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const unsubscribe = onAuthStateChange((event, session, profile) => {
      if (session?.user) {
        const emailLower = (session.user.email || '').toLowerCase();
        const isAdminEmail = emailLower === 'smyuvaraj5@gmail.com' || emailLower.includes('admin');
        const userRole = profile?.role === 'admin' ? 'admin' : (isAdminEmail ? 'admin' : (profile?.role || 'viewer'));
        const user = {
          id: session.user.id,
          name: profile?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          avatar: profile?.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.id}`,
          authType: session.user.app_metadata?.provider === 'google' ? 'Google Account' : 'Supabase Auth',
          role: userRole,
          loggedInAt: new Date().toISOString(),
        };
        loginUser(user);
      }
    });

    return () => unsubscribe();
  }, [loginUser]);

  // Hydrate memories from IndexedDB on startup
  useEffect(() => {
    loadMemories().then(memories => {
      dispatch({ type: ACTIONS.SET_MEMORIES, payload: memories });
    });
    const settings = loadSettings();
    if (Object.keys(settings).length) {
      dispatch({ type: ACTIONS.UPDATE_SETTINGS, payload: settings });
    }
  }, [dispatch]);

  // If user is not authenticated, show Auth Gate before website content
  if (!state.isAuthenticated) {
    return (
      <>
        <AuthGateway />
        <ToastContainer />
      </>
    );
  }

  const isAdmin = state.currentUser?.role === 'admin';

  // 3 Views: Home (Memory Diary), Create (Create Memory), Admin (Admin Panel - Restricted)
  const views = {
    home: <HomePage />,
    create: <CreateMemory />,
    admin: isAdmin ? <AdminPanel /> : <HomePage />,
  };

  return (
    <div className={`theme-${state.theme}`} style={{
      minHeight: '100vh',
      background: state.theme === 'dark'
        ? 'linear-gradient(145deg, #0d0705 0%, #1a0a00 30%, #150b04 60%, #0d0705 100%)'
        : 'linear-gradient(145deg, #f5eae1 0%, #ede0d4 30%, #f7efe8 60%, #f5eae1 100%)',
      position: 'relative',
      overflowX: 'hidden',
      color: state.theme === 'dark' ? 'var(--cream)' : '#3c2814',
      transition: 'background 0.4s ease, color 0.4s ease',
    }}>
      {/* Floating Ambient Particles */}
      <ParticleBackground />

      {/* Navigation Header */}
      <Navigation />

      {/* View Content */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {views[state.view] ?? <HomePage />}
      </main>

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Global Loading Overlay */}
      {state.isLoading && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, gap: '16px',
        }}>
          <div style={{
            width: '54px', height: '54px',
            border: '3px solid rgba(201,168,76,0.2)',
            borderTop: '3px solid var(--gold)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            color: 'var(--gold-light)',
            fontSize: '1rem',
          }}>
            {state.loadingMessage || 'Preserving memory...'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
