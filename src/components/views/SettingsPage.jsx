// ===== Settings Page =====
import { useState } from 'react';
import { useStore, ACTIONS } from '../../store';
import { saveSettings } from '../../services/memoryService';
import { LANGUAGES } from '../../services/aiService';

const THEMES = [
  { id: 'dark', label: '🌙 Dark Leather', desc: 'Deep dark ambiance' },
  { id: 'sepia', label: '📜 Sepia', desc: 'Warm vintage feel' },
];

export default function SettingsPage() {
  const { state, dispatch, addToast } = useStore();
  const settings = state.settings;
  const [exporting, setExporting] = useState(false);

  const update = (key, value) => {
    const updated = { ...settings, [key]: value };
    dispatch({ type: ACTIONS.UPDATE_SETTINGS, payload: updated });
    saveSettings(updated);
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        memories: state.memories,
        settings,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoir-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: 'Diary exported successfully!' });
    } catch {
      addToast({ type: 'error', message: 'Export failed. Please try again.' });
    }
    setExporting(false);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.memories && Array.isArray(data.memories)) {
          localStorage.setItem('memoir_memories', JSON.stringify(data.memories));
          dispatch({ type: ACTIONS.SET_MEMORIES, payload: data.memories });
          if (data.settings) {
            dispatch({ type: ACTIONS.UPDATE_SETTINGS, payload: data.settings });
            saveSettings(data.settings);
          }
          addToast({ type: 'success', message: `Imported ${data.memories.length} memories!` });
        }
      } catch {
        addToast({ type: 'error', message: 'Invalid backup file format.' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (!confirm('⚠️ This will permanently delete ALL memories from your diary. Are you absolutely sure?')) return;
    if (!confirm('Last chance — this cannot be undone. Delete everything?')) return;
    localStorage.removeItem('memoir_memories');
    dispatch({ type: ACTIONS.SET_MEMORIES, payload: [] });
    addToast({ type: 'success', message: 'All memories cleared.' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '80px',
      paddingBottom: '60px',
      background: 'linear-gradient(180deg, #0d0705 0%, #150b04 50%, #0d0705 100%)',
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚙</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 700,
            fontStyle: 'italic',
            background: 'linear-gradient(135deg, #c9a84c, #e8cc7a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Settings
          </h1>
        </div>

        {/* Stats */}
        <SettingsGroup title="📊 Diary Statistics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Memories', value: state.memories.length, icon: '📖' },
              { label: 'Favorites', value: state.memories.filter(m => m.favorite).length, icon: '★' },
              { label: 'With Images', value: state.memories.filter(m => m.images?.length > 0).length, icon: '🖼' },
            ].map(stat => (
              <div key={stat.label} style={{
                textAlign: 'center',
                padding: '16px 8px',
                background: 'rgba(201, 168, 76, 0.05)',
                border: '1px solid rgba(201, 168, 76, 0.12)',
                borderRadius: '10px',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 700 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(245, 234, 216, 0.4)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </SettingsGroup>

        {/* AI & Voice */}
        <SettingsGroup title="🤖 AI & Voice">
          <ToggleSetting
            label="Auto-translate stories"
            desc="Translate to multiple languages when saving"
            value={settings.autoTranslate}
            onChange={v => update('autoTranslate', v)}
          />
          <ToggleSetting
            label="Remove filler words"
            desc="Clean up 'um', 'uh', 'like' from transcripts"
            value={settings.removeFillerWords}
            onChange={v => update('removeFillerWords', v)}
          />
          <ToggleSetting
            label="Auto punctuation"
            desc="Add punctuation to voice transcripts"
            value={settings.autoPunctuation}
            onChange={v => update('autoPunctuation', v)}
          />

          <div style={{ marginTop: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', marginBottom: '6px', fontWeight: 500 }}>
              Default Language
            </label>
            <select
              value={settings.language}
              onChange={e => update('language', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255, 248, 235, 0.05)',
                border: '1px solid rgba(201, 168, 76, 0.2)',
                borderRadius: '8px',
                color: 'var(--cream)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code} style={{ background: '#1a0a00' }}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>
        </SettingsGroup>

        {/* Privacy */}
        <SettingsGroup title="🔒 Privacy & Location">
          <ToggleSetting
            label="Save GPS location"
            desc="Attach your location to each memory"
            value={settings.locationEnabled}
            onChange={v => update('locationEnabled', v)}
          />
          <ToggleSetting
            label="Save weather data"
            desc="Attach weather info to memories (requires API)"
            value={settings.weatherEnabled}
            onChange={v => update('weatherEnabled', v)}
          />

          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: 'rgba(255, 248, 235, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'rgba(245, 234, 216, 0.4)',
            lineHeight: 1.6,
          }}>
            🔒 All memories are stored locally on your device. No data is sent to external servers.
          </div>
        </SettingsGroup>

        {/* Backup */}
        <SettingsGroup title="💾 Backup & Restore">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleExport}
              disabled={exporting || state.memories.length === 0}
              className="btn-gold"
              style={{ opacity: state.memories.length === 0 ? 0.4 : 1 }}
            >
              ⬇ Export Diary (JSON)
            </button>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              borderRadius: '8px',
              color: 'var(--gold)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(201, 168, 76, 0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ⬆ Import Backup
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>
        </SettingsGroup>

        {/* Danger zone */}
        <SettingsGroup title="⚠ Danger Zone">
          <p style={{ fontSize: '0.8rem', color: 'rgba(245, 234, 216, 0.5)', marginBottom: '12px' }}>
            These actions are permanent and cannot be undone.
          </p>
          <button
            onClick={handleClearAll}
            disabled={state.memories.length === 0}
            style={{
              padding: '10px 20px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              cursor: state.memories.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: state.memories.length === 0 ? 0.4 : 1,
            }}
            onMouseEnter={e => { if (state.memories.length > 0) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
          >
            🗑 Delete All Memories
          </button>
        </SettingsGroup>

        {/* About */}
        <div style={{
          textAlign: 'center',
          padding: '24px',
          borderTop: '1px solid rgba(201, 168, 76, 0.08)',
          marginTop: '8px',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            fontStyle: 'italic',
            background: 'linear-gradient(135deg, #c9a84c, #e8cc7a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '4px',
          }}>Memoir</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(245, 234, 216, 0.3)' }}>
            Your Premium AI Digital Diary • v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <div style={{
      marginBottom: '20px',
      background: 'rgba(255, 248, 235, 0.03)',
      border: '1px solid rgba(201, 168, 76, 0.1)',
      borderRadius: '14px',
      padding: '18px 20px',
      animation: 'fadeIn 0.5s ease',
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.95rem',
        color: 'var(--gold-light)',
        marginBottom: '16px',
        paddingBottom: '10px',
        borderBottom: '1px solid rgba(201, 168, 76, 0.08)',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ToggleSetting({ label, desc, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    }}>
      <div>
        <div style={{ fontSize: '0.875rem', color: 'var(--cream)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: '0.72rem', color: 'rgba(245, 234, 216, 0.4)', marginTop: '2px' }}>{desc}</div>}
      </div>

      {/* Toggle switch */}
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          background: value
            ? 'linear-gradient(135deg, #9a7020, #c9a84c)'
            : 'rgba(255, 255, 255, 0.1)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.3s ease',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: '2px',
          left: value ? '22px' : '2px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: value ? '#fff' : 'rgba(255, 255, 255, 0.6)',
          transition: 'left 0.3s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}
