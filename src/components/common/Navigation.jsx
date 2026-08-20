// ===== Navigation — Premium Header =====
import { useState } from 'react';
import { useStore } from '../../store';
import { signOut } from '../../services/supabaseClient';

const NAV_ITEMS = [
  { id: 'home',   icon: '📖', label: 'Memory Diary' },
  { id: 'create', icon: '➕', label: 'Create Memory' },
  { id: 'admin',  icon: '👤', label: 'Admin' },
];

export default function Navigation() {
  const { state, setView, toggleTheme, logoutUser, addToast } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const active = state.view;
  const user = state.currentUser || { name: 'User', role: 'viewer', authType: 'Logged In' };
  const isAdmin = user.role === 'admin';

  // Role-Based Navigation Filtering: Viewers see ONLY Memory Diary & Create Memory. Admins see Admin tab.
  const navItems = NAV_ITEMS.filter(item => item.id !== 'admin' || isAdmin);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.warn('Supabase signout notice:', err);
    }
    logoutUser();
    addToast({ type: 'info', title: 'Signed Out', message: 'You have logged out of Memory Diary.' });
  };

  return (
    <>
      {/* ===== Desktop Header ===== */}
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '64px',
        background: state.theme === 'dark' ? 'rgba(10, 5, 2, 0.85)' : 'rgba(245, 235, 220, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: state.theme === 'dark' ? '1px solid rgba(201, 168, 76, 0.15)' : '1px solid rgba(139, 90, 43, 0.18)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.3s ease',
      }}>

        {/* Brand Logo */}
        <div
          onClick={() => { setView('home'); setMobileOpen(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, #9a7020, #c9a84c, #f4dc96)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '17px',
            boxShadow: '0 3px 12px rgba(201,168,76,0.35)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>📖</div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 700,
              fontStyle: 'italic',
              background: state.theme === 'dark'
                ? 'linear-gradient(135deg, #c9a84c, #f4dc96)'
                : 'linear-gradient(135deg, #6b4423, #a86e3b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
            }}>
              Memory Diary
            </div>
            <div style={{
              fontSize: '0.55rem',
              color: state.theme === 'dark' ? 'rgba(201,168,76,0.5)' : 'rgba(139,90,43,0.6)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              {isAdmin ? '🛡️ Admin Edition' : '👁️ Digital Library'}
            </div>
          </div>
        </div>

        {/* Navigation Links (Filtered by Role) */}
        <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {navItems.map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: isActive
                    ? (state.theme === 'dark' ? 'rgba(201, 168, 76, 0.16)' : 'rgba(139, 90, 43, 0.14)')
                    : 'transparent',
                  border: isActive
                    ? (state.theme === 'dark' ? '1px solid rgba(201, 168, 76, 0.35)' : '1px solid rgba(139, 90, 43, 0.3)')
                    : '1px solid transparent',
                  color: isActive
                    ? (state.theme === 'dark' ? 'var(--gold-light)' : '#5c3514')
                    : (state.theme === 'dark' ? 'rgba(245, 234, 216, 0.7)' : 'rgba(60, 40, 20, 0.75)'),
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = state.theme === 'dark' ? 'rgba(201, 168, 76, 0.08)' : 'rgba(139, 90, 43, 0.07)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${state.theme === 'dark' ? 'Light Leather' : 'Dark Leather'} Theme`}
            style={{
              background: state.theme === 'dark' ? 'rgba(201, 168, 76, 0.1)' : 'rgba(139, 90, 43, 0.1)',
              border: state.theme === 'dark' ? '1px solid rgba(201, 168, 76, 0.25)' : '1px solid rgba(139, 90, 43, 0.25)',
              borderRadius: '20px',
              padding: '6px 12px',
              color: state.theme === 'dark' ? 'var(--gold-light)' : '#5c3514',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{state.theme === 'dark' ? '🌙' : '☀️'}</span>
            <span className="hide-mobile" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              {state.theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Role Badge Pill */}
          <div className="hide-mobile" style={{
            padding: '6px 12px',
            background: isAdmin ? 'rgba(201, 168, 76, 0.18)' : 'rgba(148, 163, 184, 0.15)',
            border: isAdmin ? '1px solid rgba(201, 168, 76, 0.4)' : '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '20px',
            fontSize: '0.72rem',
            color: isAdmin ? 'var(--gold-light)' : '#94a3b8',
            display: 'flex', alignItems: 'center', gap: '5px',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}>
            <span>{isAdmin ? '🛡️' : '👁️'}</span>
            <span>{isAdmin ? 'Admin' : 'Viewer'}</span>
          </div>

          {/* User Profile Badge & Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px 4px 6px',
                background: state.theme === 'dark' ? 'rgba(201, 168, 76, 0.12)' : 'rgba(139, 90, 43, 0.12)',
                border: state.theme === 'dark' ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid rgba(139, 90, 43, 0.3)',
                borderRadius: '20px',
                cursor: 'pointer',
                color: state.theme === 'dark' ? 'var(--gold-light)' : '#5c3514',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--gold)', color: '#1a0a00',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.75rem',
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hide-mobile">{user.name}</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '220px',
                background: state.theme === 'dark' ? 'rgba(15, 8, 4, 0.96)' : 'rgba(252, 246, 238, 0.98)',
                border: state.theme === 'dark' ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid rgba(139, 90, 43, 0.3)',
                borderRadius: '14px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                padding: '12px',
                zIndex: 60,
                backdropFilter: 'blur(16px)',
              }}>
                <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: state.theme === 'dark' ? '#fff' : '#2d1500', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{user.name}</span>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: isAdmin ? 'rgba(201, 168, 76, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                      color: isAdmin ? 'var(--gold-light)' : '#94a3b8',
                      fontWeight: 700,
                    }}>
                      {isAdmin ? 'Admin' : 'Viewer'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'gray', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={() => { setShowUserMenu(false); handleLogout(); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(220, 38, 38, 0.12)',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="hide-desktop"
            onClick={() => setMobileOpen(v => !v)}
            style={{
              background: 'rgba(201, 168, 76, 0.1)',
              border: '1px solid rgba(201, 168, 76, 0.25)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: state.theme === 'dark' ? 'var(--gold-light)' : '#5c3514',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* ===== Mobile Dropdown Navigation ===== */}
      {mobileOpen && (
        <div className="hide-desktop" style={{
          position: 'fixed',
          top: '64px', left: 0, right: 0,
          zIndex: 49,
          background: state.theme === 'dark' ? 'rgba(10, 5, 2, 0.96)' : 'rgba(245, 235, 220, 0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: state.theme === 'dark' ? '1px solid rgba(201, 168, 76, 0.2)' : '1px solid rgba(139, 90, 43, 0.2)',
          padding: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setMobileOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px 16px',
                marginBottom: '6px',
                borderRadius: '10px',
                background: active === item.id
                  ? (state.theme === 'dark' ? 'rgba(201, 168, 76, 0.15)' : 'rgba(139, 90, 43, 0.15)')
                  : 'transparent',
                border: active === item.id
                  ? (state.theme === 'dark' ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid rgba(139, 90, 43, 0.3)')
                  : '1px solid transparent',
                color: active === item.id
                  ? (state.theme === 'dark' ? 'var(--gold-light)' : '#5c3514')
                  : (state.theme === 'dark' ? 'rgba(245, 234, 216, 0.8)' : 'rgba(60, 40, 20, 0.8)'),
                fontSize: '1rem',
                fontWeight: active === item.id ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
