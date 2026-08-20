// ===== Search Page =====
import { useState, useEffect, useCallback } from 'react';
import { useStore, ACTIONS } from '../../store';
import { searchMemories, formatDate, formatTime } from '../../services/memoryService';

export default function SearchPage() {
  const { state, dispatch, setView } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: '★ Favorites' },
    { id: 'has-images', label: '🖼 With Images' },
    { id: 'has-audio', label: '🎵 With Audio' },
    { id: 'has-video', label: '🎬 With Video' },
  ];

  const doSearch = useCallback((q, filter, sort) => {
    let filtered = searchMemories(q, state.memories);

    if (filter === 'favorites') filtered = filtered.filter(m => m.favorite);
    if (filter === 'has-images') filtered = filtered.filter(m => m.images?.length > 0);
    if (filter === 'has-audio') filtered = filtered.filter(m => m.audioFiles?.length > 0 || m.recordedAudio);
    if (filter === 'has-video') filtered = filtered.filter(m => m.videos?.length > 0);

    if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'oldest') filtered = [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sort === 'favorites') filtered = [...filtered].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));

    setResults(filtered);
  }, [state.memories]);

  useEffect(() => {
    doSearch(query, activeFilter, sortBy);
  }, [query, activeFilter, sortBy, doSearch]);

  const openInDiary = (memory) => {
    const idx = state.memories.findIndex(m => m.id === memory.id);
    if (idx >= 0) {
      dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: Math.floor(idx / 2) });
      dispatch({ type: ACTIONS.TOGGLE_DIARY, payload: true });
      setView('home');
    }
  };

  const handleDelete = (e, memory) => {
    e.stopPropagation();
    if (!confirm('Delete this memory permanently?')) return;
    const stored = JSON.parse(localStorage.getItem('memoir_memories') || '[]');
    const updated = stored.filter(m => m.id !== memory.id);
    localStorage.setItem('memoir_memories', JSON.stringify(updated));
    dispatch({ type: ACTIONS.DELETE_MEMORY, payload: memory.id });
  };

  const handleFavorite = (e, memory) => {
    e.stopPropagation();
    const stored = JSON.parse(localStorage.getItem('memoir_memories') || '[]');
    const updated = stored.map(m => m.id === memory.id ? { ...m, favorite: !m.favorite } : m);
    localStorage.setItem('memoir_memories', JSON.stringify(updated));
    dispatch({ type: ACTIONS.UPDATE_MEMORY, payload: { ...memory, favorite: !memory.favorite } });
  };

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '80px',
      paddingBottom: '40px',
      background: 'linear-gradient(180deg, #0d0705 0%, #150b04 50%, #0d0705 100%)',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⌕</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 700,
            fontStyle: 'italic',
            background: 'linear-gradient(135deg, #c9a84c, #e8cc7a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '6px',
          }}>
            Search Memories
          </h1>
          <p style={{ color: 'rgba(245, 234, 216, 0.5)', fontSize: '0.875rem' }}>
            {state.memories.length} memories in your diary
          </p>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.1rem',
            opacity: 0.4,
          }}>⌕</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            placeholder="Search by title, story, location, date, tags..."
            style={{
              width: '100%',
              padding: '14px 16px 14px 46px',
              background: 'rgba(255, 248, 235, 0.05)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              borderRadius: '12px',
              color: 'var(--cream-light)',
              fontFamily: 'var(--font-sans)',
              fontSize: '1rem',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(201, 168, 76, 0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(201, 168, 76, 0.3)'}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(245, 234, 216, 0.4)',
                cursor: 'pointer',
                fontSize: '1.2rem',
              }}
            >×</button>
          )}
        </div>

        {/* Filters & sort */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '24px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '15px',
                  border: activeFilter === f.id
                    ? '1px solid rgba(201, 168, 76, 0.5)'
                    : '1px solid rgba(201, 168, 76, 0.15)',
                  background: activeFilter === f.id ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
                  color: activeFilter === f.id ? 'var(--gold)' : 'rgba(245, 234, 216, 0.5)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >{f.label}</button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '5px 12px',
              background: 'rgba(255, 248, 235, 0.05)',
              border: '1px solid rgba(201, 168, 76, 0.15)',
              borderRadius: '8px',
              color: 'rgba(245, 234, 216, 0.7)',
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="favorites">Favorites first</option>
          </select>
        </div>

        {/* Results */}
        {state.memories.length === 0 ? (
          <EmptyState onWrite={() => setView('create')} />
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5 }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--cream)' }}>
              No memories match your search
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.8rem', color: 'rgba(245, 234, 216, 0.4)', marginBottom: '4px' }}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            {results.map((memory, i) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                index={i}
                onOpen={() => openInDiary(memory)}
                onDelete={(e) => handleDelete(e, memory)}
                onFavorite={(e) => handleFavorite(e, memory)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryCard({ memory, index, onOpen, onDelete, onFavorite }) {
  const story = memory.aiStory || memory.textContent || memory.transcript || '';
  const preview = story.slice(0, 200);

  return (
    <div
      onClick={onOpen}
      style={{
        padding: '18px 20px',
        background: 'rgba(255, 248, 235, 0.03)',
        border: '1px solid rgba(201, 168, 76, 0.1)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255, 248, 235, 0.06)';
        e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.25)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255, 248, 235, 0.03)';
        e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            {memory.mood && <span style={{ fontSize: '1rem' }}>{memory.mood.emoji}</span>}
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontStyle: 'italic',
              color: 'var(--cream-light)',
              fontWeight: 600,
              margin: 0,
            }}>
              {memory.title || 'Untitled Memory'}
            </h3>
            {memory.favorite && <span style={{ color: '#e8a020', fontSize: '0.9rem' }}>★</span>}
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '8px', fontSize: '0.72rem', color: 'rgba(245, 234, 216, 0.4)' }}>
            <span>📅 {memory.date || formatDate(memory.createdAt)}</span>
            {memory.time && <span>⏰ {memory.time}</span>}
            {memory.city && <span>📍 {memory.city}{memory.country ? `, ${memory.country}` : ''}</span>}
          </div>

          {/* Preview */}
          {preview && (
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '0.875rem',
              color: 'rgba(245, 234, 216, 0.6)',
              lineHeight: 1.7,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {preview}...
            </p>
          )}

          {/* Tags & media badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px', alignItems: 'center' }}>
            {memory.images?.length > 0 && <Badge>🖼 {memory.images.length}</Badge>}
            {memory.videos?.length > 0 && <Badge>🎬 {memory.videos.length}</Badge>}
            {memory.audioFiles?.length > 0 && <Badge>🎵 {memory.audioFiles.length}</Badge>}
            {memory.documents?.length > 0 && <Badge>📄 {memory.documents.length}</Badge>}
            {memory.tags?.slice(0, 3).map(t => (
              <Badge key={t} gold>#{t}</Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={onFavorite}
            title={memory.favorite ? 'Unfavorite' : 'Favorite'}
            style={{
              background: 'none',
              border: '1px solid rgba(201, 168, 76, 0.15)',
              borderRadius: '6px',
              color: memory.favorite ? '#e8a020' : 'rgba(245, 234, 216, 0.4)',
              padding: '6px 8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
            }}
          >
            {memory.favorite ? '★' : '☆'}
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            style={{
              background: 'none',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '6px',
              color: 'rgba(252, 165, 165, 0.5)',
              padding: '6px 8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s ease',
            }}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, gold }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '0.68rem',
      background: gold ? 'rgba(201, 168, 76, 0.08)' : 'rgba(255, 255, 255, 0.05)',
      border: `1px solid ${gold ? 'rgba(201, 168, 76, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
      color: gold ? 'rgba(201, 168, 76, 0.8)' : 'rgba(245, 234, 216, 0.5)',
    }}>
      {children}
    </span>
  );
}

function EmptyState({ onWrite }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.4 }}>📖</div>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: '1.5rem',
        color: 'var(--cream)',
        marginBottom: '8px',
        opacity: 0.7,
      }}>
        Your diary is empty
      </h2>
      <p style={{ color: 'rgba(245, 234, 216, 0.4)', marginBottom: '24px', fontSize: '0.9rem' }}>
        Write your first memory to begin your story
      </p>
      <button onClick={onWrite} className="btn-gold">
        ✦ Write First Memory
      </button>
    </div>
  );
}
