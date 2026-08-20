// ===== Memory Timeline View =====
import { useState, useMemo } from 'react';
import { useStore, ACTIONS } from '../../store';
import { formatDate } from '../../services/memoryService';

export default function TimelinePage() {
  const { state, dispatch, setView } = useStore();
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const memories = state.memories;

  // Group by year → month → day
  const grouped = useMemo(() => {
    let filtered = [...memories];
    if (selectedYear !== 'all') {
      filtered = filtered.filter(m => new Date(m.createdAt).getFullYear() === Number(selectedYear));
    }
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(m => new Date(m.createdAt).getMonth() === Number(selectedMonth));
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const groups = {};
    filtered.forEach(m => {
      const d = new Date(m.createdAt);
      const year = d.getFullYear();
      const month = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = {};
      if (!groups[year][month][day]) groups[year][month][day] = [];
      groups[year][month][day].push(m);
    });
    return groups;
  }, [memories, selectedYear, selectedMonth]);

  const years = [...new Set(memories.map(m => new Date(m.createdAt).getFullYear()))].sort((a, b) => b - a);
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const openMemory = (memory) => {
    const idx = state.memories.findIndex(m => m.id === memory.id);
    if (idx >= 0) {
      dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: Math.floor(idx / 2) });
      dispatch({ type: ACTIONS.TOGGLE_DIARY, payload: true });
      setView('home');
    }
  };

  const totalFiltered = Object.values(grouped)
    .flatMap(yr => Object.values(yr).flatMap(mo => Object.values(mo).flat())).length;

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '80px',
      paddingBottom: '60px',
      background: 'linear-gradient(180deg, #0d0705 0%, #150b04 50%, #0d0705 100%)',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 700, fontStyle: 'italic',
            background: 'linear-gradient(135deg, #c9a84c, #e8cc7a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: '6px',
          }}>
            Memory Timeline
          </h1>
          <p style={{ color: 'rgba(245,234,216,0.45)', fontSize: '0.875rem' }}>
            {memories.length} memories across {years.length} {years.length === 1 ? 'year' : 'years'}
          </p>
        </div>

        {/* Filters */}
        {memories.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              style={selectStyle}>
              <option value="all">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              style={selectStyle}>
              <option value="all">All Months</option>
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>

            {(selectedYear !== 'all' || selectedMonth !== 'all') && (
              <button
                onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: '8px',
                  color: 'rgba(201,168,76,0.6)',
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}>
                × Clear
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {memories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.5 }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📅</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--cream)' }}>
              No memories yet — start writing your story
            </p>
            <button onClick={() => setView('create')} className="btn-gold" style={{ marginTop: '20px' }}>
              ✦ Write First Memory
            </button>
          </div>
        ) : totalFiltered === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--cream)' }}>
              No memories for the selected period
            </p>
          </div>
        ) : (
          /* Timeline */
          Object.entries(grouped).map(([year, months]) => (
            <div key={year}>
              {/* Year marker */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  color: 'rgba(201,168,76,0.6)',
                  flexShrink: 0,
                }}>
                  {year}
                </div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
              </div>

              {Object.entries(months).map(([month, days]) => (
                <div key={month} style={{ marginBottom: '24px', paddingLeft: '20px' }}>
                  {/* Month label */}
                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'rgba(201,168,76,0.5)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span>📖</span>
                    <span>{month}</span>
                  </div>

                  {/* Days */}
                  {Object.entries(days).map(([day, dayMemories]) => (
                    <div key={day} style={{ marginBottom: '16px', display: 'flex', gap: '14px' }}>
                      {/* Timeline line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #c9a84c, #e8cc7a)',
                          boxShadow: '0 0 8px rgba(201,168,76,0.4)',
                          flexShrink: 0, marginTop: '4px',
                        }} />
                        <div style={{ width: '1px', flex: 1, background: 'linear-gradient(180deg, rgba(201,168,76,0.25), transparent)', marginTop: '4px' }} />
                      </div>

                      {/* Day content */}
                      <div style={{ flex: 1, paddingBottom: '8px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(245,234,216,0.38)', marginBottom: '8px', fontStyle: 'italic' }}>
                          {day}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {dayMemories.map(memory => (
                            <TimelineCard key={memory.id} memory={memory} onOpen={() => openMemory(memory)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TimelineCard({ memory, onOpen }) {
  const story = memory.aiStory || memory.textContent || memory.transcript || '';
  const preview = story.slice(0, 120);

  return (
    <div
      onClick={onOpen}
      style={{
        padding: '12px 16px',
        background: 'rgba(255,248,235,0.03)',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,248,235,0.06)';
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.24)';
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,248,235,0.03)';
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
        {memory.mood && <span style={{ fontSize: '0.9rem' }}>{memory.mood.emoji}</span>}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--cream-light)',
        }}>{memory.title || 'Untitled'}</span>
        {memory.favorite && <span style={{ color: '#d97706', fontSize: '0.8rem' }}>★</span>}
        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'rgba(245,234,216,0.3)' }}>
          {memory.time}
        </span>
      </div>

      {preview && (
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '0.8rem',
          color: 'rgba(245,234,216,0.5)',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{preview}…</p>
      )}

      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
        {memory.city && (
          <Chip>📍 {memory.city}</Chip>
        )}
        {memory.images?.length > 0 && <Chip>🖼 {memory.images.length}</Chip>}
        {memory.audioFiles?.length > 0 && <Chip>🎵</Chip>}
        {memory.videos?.length > 0 && <Chip>🎬</Chip>}
        {memory.tags?.slice(0, 2).map(t => <Chip key={t} gold>#{t}</Chip>)}
      </div>
    </div>
  );
}

function Chip({ children, gold }) {
  return (
    <span style={{
      padding: '1px 7px',
      borderRadius: '8px',
      fontSize: '0.62rem',
      background: gold ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${gold ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.07)'}`,
      color: gold ? 'rgba(201,168,76,0.75)' : 'rgba(245,234,216,0.42)',
    }}>
      {children}
    </span>
  );
}

const selectStyle = {
  padding: '8px 14px',
  background: 'rgba(255,248,235,0.04)',
  border: '1px solid rgba(201,168,76,0.18)',
  borderRadius: '8px',
  color: 'rgba(245,234,216,0.7)',
  fontSize: '0.82rem',
  cursor: 'pointer',
};
