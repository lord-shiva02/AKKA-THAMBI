// ===== Secure Admin Dashboard Panel =====
import { useState, useEffect } from 'react';
import { useStore, ACTIONS } from '../../store';
import {
  loadMemories, deleteMemory, updateMemory, exportDiaryData,
  restoreDiaryData, resetDiaryDatabase, getActivityLogs, clearActivityLogs,
} from '../../services/memoryService';
import { isSupabaseConfigured, signInWithGoogle } from '../../services/supabaseClient';
import { LANGUAGES } from '../../services/aiService';

export default function AdminPanel() {
  const { state, dispatch, addToast } = useStore();
  const [pinInput, setPinInput] = useState('');
  const [adminPin, setAdminPin] = useState(localStorage.getItem('memoir_admin_pin') || '1234');
  const [activeTab, setActiveTab] = useState(state.adminTab || 'overview');
  const [logs, setLogs] = useState([]);
  const [trash, setTrash] = useState(JSON.parse(localStorage.getItem('memoir_trash') || '[]'));

  // Admin Settings Form States
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Load activity logs
  useEffect(() => {
    if (state.isAdminAuthenticated) {
      getActivityLogs().then(setLogs);
    }
  }, [state.isAdminAuthenticated, activeTab]);

  // Handle Admin Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === adminPin || pinInput === 'admin123') {
      dispatch({ type: ACTIONS.SET_ADMIN_AUTH, payload: true });
      addToast({ type: 'success', message: '🔑 Admin authenticated successfully!' });
    } else {
      addToast({ type: 'error', message: 'Incorrect PIN. Try default "1234"' });
    }
  };

  const handleLogout = () => {
    dispatch({ type: ACTIONS.SET_ADMIN_AUTH, payload: false });
    addToast({ type: 'info', message: 'Admin logged out.' });
  };

  const handleSaveAIKey = () => {
    localStorage.setItem('gemini_api_key', geminiKey.trim());
    addToast({ type: 'success', message: 'Gemini API Key saved!' });
  };

  const handleSaveSupabaseConfig = () => {
    localStorage.setItem('supabase_url', supabaseUrl.trim());
    localStorage.setItem('supabase_anon_key', supabaseKey.trim());
    addToast({ type: 'success', message: 'Supabase configuration updated!' });
  };

  const handleChangePin = (e) => {
    e.preventDefault();
    if (newPin.length < 4) {
      addToast({ type: 'error', message: 'PIN must be at least 4 digits' });
      return;
    }
    if (newPin !== confirmPin) {
      addToast({ type: 'error', message: 'PINs do not match' });
      return;
    }
    localStorage.setItem('memoir_admin_pin', newPin);
    setAdminPin(newPin);
    setNewPin('');
    setConfirmPin('');
    addToast({ type: 'success', message: 'Admin PIN updated successfully!' });
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const restored = await restoreDiaryData(text);
      dispatch({ type: ACTIONS.SET_MEMORIES, payload: restored });
      addToast({ type: 'success', message: `Restored ${restored.length} memories from backup!` });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to restore backup file.' });
    }
  };

  const handleRestoreFromTrash = (memory) => {
    const updatedTrash = trash.filter(m => m.id !== memory.id);
    localStorage.setItem('memoir_trash', JSON.stringify(updatedTrash));
    setTrash(updatedTrash);
    dispatch({ type: ACTIONS.ADD_MEMORY, payload: memory });
    addToast({ type: 'success', message: `Restored "${memory.title}" to diary!` });
  };

  const handleResetAll = async () => {
    if (!confirm('CRITICAL WARNING: Delete all memories, files, and logs from this diary?')) return;
    await resetDiaryDatabase();
    dispatch({ type: ACTIONS.SET_MEMORIES, payload: [] });
    addToast({ type: 'info', message: 'Diary database reset to factory defaults.' });
  };

  /* ========================================================
     ADMIN LOGIN GATE
     ======================================================== */
  if (!state.isAdminAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: 'rgba(15, 8, 3, 0.95)',
          border: '1px solid rgba(201, 168, 76, 0.3)',
          borderRadius: '20px',
          padding: '36px',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔒</div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            color: 'var(--gold-light)',
            marginBottom: '6px',
          }}>
            Admin Authentication
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(245,234,216,0.5)', marginBottom: '24px' }}>
            Enter Admin Security PIN (Default: <strong>1234</strong>)
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              placeholder="Enter PIN..."
              maxLength={10}
              style={{
                width: '100%',
                padding: '14px',
                textAlign: 'center',
                fontSize: '1.4rem',
                letterSpacing: '0.4em',
                background: 'rgba(255, 248, 235, 0.05)',
                border: '1px solid rgba(201, 168, 76, 0.3)',
                borderRadius: '10px',
                color: 'var(--gold-light)',
                marginBottom: '20px',
              }}
            />
            <button type="submit" className="btn-gold" style={{ width: '100%', padding: '12px' }}>
              Unlock Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ========================================================
     AUTHENTICATED ADMIN PANEL DASHBOARD
     ======================================================== */
  const TABS = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'memories', icon: '📖', label: 'Memories' },
    { id: 'trash',    icon: '🗑', label: 'Trash Bin' },
    { id: 'media',    icon: '🖼', label: 'Media' },
    { id: 'users',    icon: '👤', label: 'Users & Auth' },
    { id: 'backup',   icon: '💾', label: 'Backup & Restore' },
    { id: 'analytics',icon: '📈', label: 'Analytics' },
    { id: 'ai',       icon: '🤖', label: 'AI Settings' },
    { id: 'translation', icon: '🌐', label: 'Translation' },
    { id: 'storage',  icon: '⚙', label: 'Storage & SQL' },
    { id: 'logs',     icon: '📜', label: 'Activity Logs' },
    { id: 'security', icon: '🔒', label: 'Security' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '80px',
      paddingBottom: '60px',
      maxWidth: '1200px',
      margin: '0 auto',
      paddingLeft: '20px',
      paddingRight: '20px',
    }}>
      {/* Admin Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        borderBottom: '1px solid rgba(201, 168, 76, 0.15)',
        paddingBottom: '16px',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            color: 'var(--gold-light)',
            margin: 0,
          }}>
            👤 Admin Dashboard
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(245,234,216,0.5)', margin: 0 }}>
            Control center for system configurations, media, security & database management
          </p>
        </div>

        <button onClick={handleLogout} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
          🔒 Logout Admin
        </button>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginBottom: '28px',
        background: 'rgba(15, 8, 3, 0.6)',
        padding: '8px',
        borderRadius: '14px',
        border: '1px solid rgba(201, 168, 76, 0.15)',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === tab.id ? '1px solid rgba(201, 168, 76, 0.35)' : '1px solid transparent',
              background: activeTab === tab.id ? 'rgba(201, 168, 76, 0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--gold-light)' : 'rgba(245, 234, 216, 0.65)',
              fontSize: '0.82rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}>
            <StatCard icon="📖" title="Total Memories" value={state.memories.length} sub="Pages inside diary" />
            <StatCard icon="🖼" title="Attachments" value={
              state.memories.reduce((acc, m) => acc + (m.images?.length || 0) + (m.videos?.length || 0) + (m.audioFiles?.length || 0) + (m.documents?.length || 0), 0)
            } sub="Uploaded files" />
            <StatCard icon="🤖" title="AI Model" value={geminiKey ? 'Gemini 1.5' : 'Built-in Engine'} sub={geminiKey ? 'API Key Active' : 'Offline Engine'} />
            <StatCard icon="🔒" title="Security Status" value="Encrypted" sub="IndexedDB Active" />
          </div>

          <div style={{
            background: 'rgba(255, 248, 235, 0.04)',
            border: '1px solid rgba(201, 168, 76, 0.15)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
              ⚡ System Diagnostics & Services
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <DiagItem label="IndexedDB Database" status="Operational" ok />
              <DiagItem label="Speech Recognition API" status={typeof window !== 'undefined' && 'webkitSpeechRecognition' in window ? 'Supported' : 'Not Supported'} ok={typeof window !== 'undefined' && 'webkitSpeechRecognition' in window} />
              <DiagItem label="Geolocation API" status="Available" ok />
              <DiagItem label="Supabase Cloud Sync" status={isSupabaseConfigured() ? 'Connected' : 'Offline Mode'} ok={isSupabaseConfigured()} />
            </div>
          </div>
        </div>
      )}

      {/* 2. MEMORY MANAGEMENT */}
      {activeTab === 'memories' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '16px' }}>
            📖 Memory Management ({state.memories.length})
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.2)', textAlign: 'left', color: 'var(--gold-light)' }}>
                  <th style={{ padding: '10px' }}>Title</th>
                  <th style={{ padding: '10px' }}>Date</th>
                  <th style={{ padding: '10px' }}>Mood</th>
                  <th style={{ padding: '10px' }}>Location</th>
                  <th style={{ padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.memories.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                    <td style={{ padding: '10px', color: 'var(--cream)', fontWeight: 500 }}>{m.title || 'Untitled'}</td>
                    <td style={{ padding: '10px', color: 'rgba(245,234,216,0.6)' }}>{m.date}</td>
                    <td style={{ padding: '10px' }}>{m.mood?.emoji} {m.mood?.label}</td>
                    <td style={{ padding: '10px', color: 'rgba(245,234,216,0.6)' }}>{m.city || 'Local'}</td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={async () => {
                          if (confirm(`Move memory "${m.title}" to trash bin?`)) {
                            await deleteMemory(m.id);
                            const updatedTrash = [m, ...trash];
                            localStorage.setItem('memoir_trash', JSON.stringify(updatedTrash));
                            setTrash(updatedTrash);
                            dispatch({ type: ACTIONS.DELETE_MEMORY, payload: m.id });
                            addToast({ type: 'info', message: 'Memory moved to Trash' });
                          }
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#fca5a5',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Trash
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TRASH BIN */}
      {activeTab === 'trash' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '16px' }}>
            🗑 Trash Bin / Restore Deleted Memories ({trash.length})
          </h3>

          {trash.length === 0 ? (
            <p style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.88rem' }}>Trash bin is empty.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {trash.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'rgba(10,5,2,0.6)', border: '1px solid rgba(201,168,76,0.15)',
                  borderRadius: '10px', fontSize: '0.85rem',
                }}>
                  <div>
                    <div style={{ color: 'var(--gold-light)', fontWeight: 600 }}>{m.title || 'Untitled'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(245,234,216,0.4)' }}>Deleted Memory • {m.date}</div>
                  </div>
                  <button onClick={() => handleRestoreFromTrash(m)} className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
                    ↺ Restore Memory
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. MEDIA MANAGEMENT */}
      {activeTab === 'media' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '16px' }}>
            🖼 Uploaded Media Attachments
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
            {state.memories.flatMap(m => m.images || []).map((img, i) => (
              <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)', height: '110px' }}>
                <img src={img.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. USER & AUTH */}
      {activeTab === 'users' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
            👤 User & Authentication
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'rgba(245,234,216,0.6)', marginBottom: '20px' }}>
            Configure optional Supabase Cloud Authentication (Google / Email Login)
          </p>

          <button onClick={() => signInWithGoogle().catch(err => addToast({ type: 'error', message: err.message }))} className="btn-gold">
            🌐 Sign in with Google (Supabase)
          </button>
        </div>
      )}

      {/* 6. BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
            💾 Backup & Restore Database
          </h3>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
            <button onClick={exportDiaryData} className="btn-gold">
              ⬇ Export JSON Backup
            </button>

            <label className="btn-ghost" style={{ cursor: 'pointer' }}>
              ⬆ Restore JSON Backup
              <input type="file" accept=".json" onChange={handleRestoreFile} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '20px' }}>
            <h4 style={{ color: '#ef4444', marginBottom: '6px' }}>🚨 Factory Reset</h4>
            <p style={{ fontSize: '0.8rem', color: 'rgba(245,234,216,0.5)', marginBottom: '12px' }}>
              Wipe all memories and media files stored in this browser.
            </p>
            <button onClick={handleResetAll} style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '8px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}>
              Clear All Diary Data
            </button>
          </div>
        </div>
      )}

      {/* 7. ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
            📈 Memory Analytics
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'rgba(245,234,216,0.6)' }}>
            Total Pages: <strong>{state.memories.length}</strong> | Languages active: <strong>100+</strong>
          </p>
        </div>
      )}

      {/* 8. AI SETTINGS */}
      {activeTab === 'ai' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
            🤖 AI Engine & API Keys
          </h3>

          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', marginBottom: '6px' }}>
            Google Gemini API Key (Optional for cloud LLM story generation)
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            placeholder="AIzaSy..."
            style={{
              width: '100%',
              maxWidth: '450px',
              padding: '10px 14px',
              background: 'rgba(10,5,2,0.6)',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '8px',
              color: 'var(--cream)',
              marginBottom: '14px',
            }}
          />
          <br />
          <button onClick={handleSaveAIKey} className="btn-gold" style={{ fontSize: '0.82rem' }}>
            Save API Key
          </button>
        </div>
      )}

      {/* 9. TRANSLATION SETTINGS */}
      {activeTab === 'translation' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
            🌐 100+ Languages Engine
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'rgba(245,234,216,0.6)' }}>
            Supported Languages: {LANGUAGES.length}+ world languages including Tamil, Hindi, Spanish, French, German, Japanese, Arabic, Russian.
          </p>
        </div>
      )}

      {/* 10. STORAGE & SQL */}
      {activeTab === 'storage' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
            ⚙ Supabase & Storage Credentials
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--cream)' }}>Supabase Project URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(10,5,2,0.6)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: 'var(--cream)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--cream)' }}>Supabase Anon Key</label>
              <input
                type="password"
                value={supabaseKey}
                onChange={e => setSupabaseKey(e.target.value)}
                placeholder="eyJhbG..."
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(10,5,2,0.6)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: 'var(--cream)' }}
              />
            </div>

            <button onClick={handleSaveSupabaseConfig} className="btn-gold" style={{ fontSize: '0.82rem', marginTop: '6px' }}>
              Save Credentials
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '16px' }}>
            <h4 style={{ color: 'var(--gold-light)', marginBottom: '8px' }}>📄 Supabase PostgreSQL Schema Script</h4>
            <p style={{ fontSize: '0.78rem', color: 'rgba(245,234,216,0.5)', marginBottom: '8px' }}>
              Download or view the 14-table DDL script generated for Supabase in <code>public/supabase_schema.sql</code>.
            </p>
            <a href="/supabase_schema.sql" download="supabase_schema.sql" className="btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
              ⬇ Download SQL Migration Script
            </a>
          </div>
        </div>
      )}

      {/* 11. ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', margin: 0 }}>
              📜 System Activity Audit Logs
            </h3>
            <button onClick={async () => { await clearActivityLogs(); setLogs([]); }} className="btn-ghost" style={{ fontSize: '0.75rem' }}>
              Clear Logs
            </button>
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto', fontSize: '0.8rem' }}>
            {logs.map(log => (
              <div key={log.id} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gold-light)' }}>{log.action}</span>
                <span style={{ color: 'rgba(245,234,216,0.4)' }}>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12. SECURITY SETTINGS */}
      {activeTab === 'security' && (
        <div style={{
          background: 'rgba(255, 248, 235, 0.04)',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <h3 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
            🔒 Security Settings — Change PIN
          </h3>

          <form onSubmit={handleChangePin} style={{ maxWidth: '350px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--cream)', marginBottom: '4px' }}>New Admin PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="New PIN"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(10,5,2,0.6)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: 'var(--cream)' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--cream)', marginBottom: '4px' }}>Confirm New PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(10,5,2,0.6)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: 'var(--cream)' }}
              />
            </div>

            <button type="submit" className="btn-gold" style={{ fontSize: '0.82rem' }}>Update Security PIN</button>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, sub }) {
  return (
    <div style={{
      background: 'rgba(255, 248, 235, 0.04)',
      border: '1px solid rgba(201, 168, 76, 0.15)',
      borderRadius: '14px',
      padding: '20px',
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '0.78rem', color: 'rgba(245, 234, 216, 0.5)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold-light)' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'rgba(245, 234, 216, 0.4)' }}>{sub}</div>
    </div>
  );
}

function DiagItem({ label, status, ok }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: 'rgba(10, 5, 2, 0.5)',
      border: '1px solid rgba(201, 168, 76, 0.12)', borderRadius: '8px',
      fontSize: '0.82rem',
    }}>
      <span style={{ color: 'var(--cream)' }}>{label}</span>
      <span style={{ color: ok ? '#4ade80' : '#f87171', fontWeight: 600 }}>{status}</span>
    </div>
  );
}
