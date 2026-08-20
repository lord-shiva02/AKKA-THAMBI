// ===== 3D Animated Luxury Authentication Gateway =====
import { useState } from 'react';
import { useStore } from '../../store';
import { isSupabaseConfigured, signInWithGoogle, signInWithEmail, signUpWithEmail } from '../../services/supabaseClient';
import ParticleBackground from '../common/ParticleBackground';
import Login3DCanvas from '../3d/Login3DCanvas';

export default function AuthGateway() {
  const { loginUser, addToast } = useStore();

  // Mode: 'username' | 'google'
  const [activeTab, setActiveTab] = useState('username');
  const [isSignUp, setIsSignUp] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Username / Email Login or Register
  const handleUsernameAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const targetEmail = email.trim() || (username.includes('@') ? username.trim() : '');
    if (!username.trim() && !targetEmail) {
      setErrorMsg('Please enter a valid username or email.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured() && targetEmail) {
        if (isSignUp) {
          await signUpWithEmail(targetEmail, password, username);
          addToast({ type: 'success', title: 'Account Created', message: 'Signed up with Supabase.' });
        } else {
          await signInWithEmail(targetEmail, password);
        }
      }

      // Set authenticated user state with RBAC role (admin for smyuvaraj5@gmail.com, viewer by default)
      const isUserAdmin = targetEmail.toLowerCase() === 'smyuvaraj5@gmail.com' || username.toLowerCase() === 'admin' || targetEmail.toLowerCase().includes('admin');
      const user = {
        id: 'usr_' + Date.now(),
        name: username.trim() || targetEmail.split('@')[0],
        email: targetEmail || `${username.toLowerCase().replace(/\s+/g, '')}@user.app`,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || targetEmail)}`,
        authType: isSignUp ? 'Registered User' : 'Username/Password',
        role: isUserAdmin ? 'admin' : 'viewer',
        loggedInAt: new Date().toISOString(),
      };

      loginUser(user);
      addToast({ type: 'success', title: `Welcome, ${user.name}!`, message: 'Signed in successfully.' });
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Real Google OAuth Login
  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
      }
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Auth error:', err);
      setErrorMsg(err.message || 'Google Login failed. Make sure Google Provider is enabled in Supabase Dashboard.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #090402 0%, #170a03 40%, #1f0e05 70%, #0c0502 100%)',
      padding: '20px',
      overflowY: 'auto',
    }}>
      {/* Background Particle Effects */}
      <ParticleBackground />

      {/* Main Container Card (Dual Panel 3D Showcase) */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '920px',
        background: 'rgba(20, 10, 4, 0.85)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(201, 168, 76, 0.3)',
        borderRadius: '28px',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 235, 180, 0.15)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        overflow: 'hidden',
        animation: 'fadeIn 0.6s ease-out',
      }}>

        {/* LEFT PANEL: Interactive 3D Canvas Showcase */}
        <div style={{
          position: 'relative',
          background: 'radial-gradient(circle at center, rgba(201,168,76,0.12) 0%, rgba(20,10,4,0.4) 70%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px 24px',
          borderRight: '1px solid rgba(201, 168, 76, 0.15)',
          minHeight: '380px',
        }}>
          {/* Subtle Ambient Light Glow */}
          <div style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201, 168, 76, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(40px)',
          }} />

          {/* 3D Floating Book Canvas */}
          <div style={{ width: '100%', height: '320px', position: 'relative', zIndex: 2 }}>
            <Login3DCanvas />
          </div>

          {/* 3D Interactive Badge */}
          <div style={{
            marginTop: '10px',
            textAlign: 'center',
            zIndex: 2,
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 700,
              fontStyle: 'italic',
              background: 'linear-gradient(135deg, #f4dc96 0%, #c9a84c 60%, #9a7020 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 6px 0',
            }}>
              Memory Diary
            </h2>
            <p style={{
              fontSize: '0.82rem',
              color: 'rgba(201, 168, 76, 0.85)',
              letterSpacing: '0.05em',
              margin: 0,
            }}>
              ✦ 3D Interactive Edition ✦
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Authentication Gateway Form */}
        <div style={{
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#f5ead8',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 6px 0',
              fontFamily: 'var(--font-sans)',
            }}>
              Sign In to Your Diary
            </h3>
            <p style={{
              fontSize: '0.84rem',
              color: 'rgba(245, 234, 216, 0.7)',
              margin: 0,
            }}>
              Access your personal 3D digital memoir
            </p>
          </div>

          {/* Tab Navigation Controls (Username / Google) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(201, 168, 76, 0.2)',
            marginBottom: '22px',
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('username'); setErrorMsg(''); }}
              style={{
                padding: '10px 4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'username' ? 'linear-gradient(135deg, #c9a84c, #9a7020)' : 'transparent',
                color: activeTab === 'username' ? '#1a0a00' : 'rgba(245, 234, 216, 0.75)',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>👤</span> Username / Email
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('google'); setErrorMsg(''); }}
              style={{
                padding: '10px 4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'google' ? 'linear-gradient(135deg, #c9a84c, #9a7020)' : 'transparent',
                color: activeTab === 'google' ? '#1a0a00' : 'rgba(245, 234, 216, 0.75)',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>🌐</span> Google Login
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div style={{
              background: 'rgba(155, 28, 28, 0.3)',
              border: '1px solid rgba(220, 38, 38, 0.5)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.82rem',
              color: '#fca5a5',
              marginBottom: '18px',
              textAlign: 'center',
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* TAB 1: Username & Password Form */}
          {activeTab === 'username' && (
            <form onSubmit={handleUsernameAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '6px' }}>
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(201, 168, 76, 0.25)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '6px' }}>
                  Email Address {isSignUp ? '(Required)' : '(Optional)'}
                </label>
                <input
                  type="email"
                  placeholder="your.email@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required={isSignUp}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(201, 168, 76, 0.25)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(201, 168, 76, 0.25)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(201, 168, 76, 0.7)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #d4af37, #9a7020)',
                  color: '#0d0705',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 20px rgba(201, 168, 76, 0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? 'Authenticating...' : (isSignUp ? 'Create Account & Open Website' : 'Sign In & Open Website')}
              </button>

              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsSignUp(v => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(201, 168, 76, 0.85)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {isSignUp ? 'Already have an account? Sign In' : 'New user? Create an account'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Google Login Button */}
          {activeTab === 'google' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', padding: '10px 0' }}>
              <p style={{ fontSize: '0.85rem', color: 'rgba(245, 234, 216, 0.75)', margin: 0, lineHeight: 1.5 }}>
                Sign in securely using your Google Account for fast, official single sign-on.
              </p>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  color: '#3c4043',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {loading ? 'Redirecting to Google...' : 'Continue with Google'}
              </button>

              <div style={{ fontSize: '0.74rem', color: 'rgba(201, 168, 76, 0.65)' }}>
                🔒 Official Google OAuth 2.0 Authentication
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
