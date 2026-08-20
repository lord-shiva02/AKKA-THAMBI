// ===== 3D Memory Diary — Interactive Book & Storage Viewer =====
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useStore, ACTIONS } from '../../store';
import { LANGUAGES } from '../../services/aiService';
import { deleteMemory, toggleFavorite, searchMemories } from '../../services/memoryService';
import Diary3DCanvas from '../3d/Diary3DCanvas';
import styles from './DiaryBook.module.css';

/* ========================================================
   DIARY PAGE CONTENT COMPONENT
   ======================================================== */
function DiaryPage({ memory, pageIndex }) {
  const [langCode, setLangCode] = useState('en');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const { state, dispatch, addToast } = useStore();
  const isAdmin = state.currentUser?.role === 'admin';

  const story = memory.translations?.[langCode] || memory.aiStory || memory.textContent || memory.transcript || '';

  const handleDelete = async () => {
    if (!isAdmin) {
      addToast({ type: 'error', message: 'Only Admins can delete memories.' });
      return;
    }
    if (!confirm('Remove this memory from your diary?')) return;
    await deleteMemory(memory.id);
    dispatch({ type: ACTIONS.DELETE_MEMORY, payload: memory.id });
    addToast({ type: 'info', message: 'Memory moved to Trash.' });
  };

  const handleFav = async () => {
    const updated = await toggleFavorite(memory.id);
    if (updated) {
      dispatch({ type: ACTIONS.UPDATE_MEMORY, payload: updated });
    }
  };

  return (
    <div className={styles.pageContent}>

      {/* Header */}
      <div className={styles.pcHeader}>
        <div className={styles.pcDate}>
          {memory.day && `${memory.day}, `}{memory.date}
          {memory.time && <><br />{memory.time}</>}
        </div>
        <div className={styles.pcActions}>
          <button className={styles.iconBtn} onClick={handleFav}
            style={{ color: memory.favorite ? '#d97706' : undefined }}
            title={memory.favorite ? 'Unfavorite' : 'Favorite'}>
            {memory.favorite ? '★' : '☆'}
          </button>
          {isAdmin && (
            <button className={styles.iconBtn} onClick={handleDelete}
              style={{ color: '#b45309' }} title="Delete Memory (Admin Only)">🗑</button>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className={styles.pcTitle}>{memory.title || 'Untitled Memory'}</h2>

      {/* Mood Badge */}
      {memory.mood && (
        <div className={styles.moodBadge}>
          <span>{memory.mood.emoji}</span>
          <span>{memory.mood.label}</span>
        </div>
      )}

      {/* Story */}
      <div className={styles.storyText}>
        {story || <em style={{ opacity: 0.5 }}>No text written…</em>}
      </div>

      {/* Full Real-Time Voice Recording Section */}
      {(memory.recordedAudio || memory.transcript) && (
        <div style={{
          marginTop: '12px',
          marginBottom: '14px',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.15) 0%, rgba(139, 90, 43, 0.08) 100%)',
          border: '1.5px solid rgba(201, 168, 76, 0.35)',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5c3514', fontWeight: 700, fontSize: '0.9rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🎙</span> Real-Time Voice Recording
            </div>
            {memory.recordedAudio?.duration > 0 && (
              <span style={{
                fontSize: '0.72rem',
                background: 'rgba(139, 90, 43, 0.18)',
                color: '#5c3514',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}>
                {Math.floor(memory.recordedAudio.duration / 60)}:{(memory.recordedAudio.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          {/* Interactive Audio Recording Player */}
          {memory.recordedAudio?.data && (
            <div style={{ marginTop: '8px', marginBottom: '10px' }}>
              <audio
                controls
                src={memory.recordedAudio.data}
                style={{ width: '100%', height: '36px', borderRadius: '6px' }}
              />
            </div>
          )}

        </div>
      )}

      {/* Tags */}
      {memory.tags?.length > 0 && (
        <div className={styles.tagList}>
          {memory.tags.map((t, i) => <span key={i} className={styles.tag}>#{t}</span>)}
        </div>
      )}

      {/* Images Grid */}
      {memory.images?.length > 0 && (
        <div className={styles.mediaGrid}>
          {memory.images.map((img, i) => (
            <div key={i} className={styles.mediaThumb} onClick={() => setLightboxSrc(img.data)}>
              <img src={img.data} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* Additional Audio Files */}
      {memory.audioFiles?.filter(a => a.name !== memory.recordedAudio?.name).map((a, i) => (
        <div key={i} className={styles.mediaRow}>
          <span style={{ fontSize: '1.1rem' }}>🎵</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
          <audio controls src={a.data} style={{ height: '26px', width: '140px' }} />
        </div>
      ))}

      {/* Video Players */}
      {memory.videos?.map((v, i) => (
        <div key={i} style={{ marginTop: '8px' }}>
          <video controls src={v.data} style={{ width: '100%', maxHeight: '110px', borderRadius: '6px' }} />
        </div>
      ))}

      {/* Documents, PDFs, and Files */}
      {memory.documents?.map((d, i) => (
        <a key={i} href={d.data} download={d.name} className={styles.docLink}>
          📄 {d.name}
        </a>
      ))}

      {/* Location & Device Metadata */}
      <div className={styles.pcFooter}>
        {memory.city && (
          <span>📍 {memory.city}{memory.state ? `, ${memory.state}` : ''}{memory.country ? `, ${memory.country}` : ''}</span>
        )}
        {memory.device && <span>💻 {memory.device}</span>}
      </div>

      {/* Page number */}
      <div className={styles.pageNum}>Page {pageIndex + 1}</div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <img src={lightboxSrc} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px' }} />
          <button
            onClick={() => setLightboxSrc(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: '50%', width: '36px', height: '36px',
              color: '#fff', fontSize: '1rem', cursor: 'pointer',
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}

function EmptyPage({ msg }) {
  return (
    <div className={styles.emptyPage}>
      <div className={styles.emptyIcon}>📖</div>
      <p className={styles.emptyText}>{msg}</p>
    </div>
  );
}

/* ========================================================
   MAIN DIARY BOOK COMPONENT
   ======================================================== */
export default function DiaryBook() {
  const { state, dispatch, setView } = useStore();
  const [open, setOpen] = useState(false);
  const [spread, setSpread] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipSide, setFlipSide] = useState(null);

  // Search & Filter State inside Opened Diary
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState('all');

  const memories = state.memories;

  // Check for "On This Day" memories (same month and day from previous years/entries)
  const onThisDayMemories = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    return memories.filter(m => {
      const d = new Date(m.createdAt || m.timestamp);
      return d.getMonth() === todayMonth && d.getDate() === todayDate;
    });
  }, [memories]);

  // Filtered memories list for in-diary search
  const filteredMemories = useMemo(() => {
    let result = searchMemories(searchQuery, memories);
    if (mediaFilter === 'favorites') result = result.filter(m => m.favorite);
    if (mediaFilter === 'images') result = result.filter(m => m.images?.length > 0);
    if (mediaFilter === 'audio') result = result.filter(m => m.audioFiles?.length > 0);
    if (mediaFilter === 'video') result = result.filter(m => m.videos?.length > 0);
    if (mediaFilter === 'pdf') result = result.filter(m => m.documents?.length > 0);
    return result;
  }, [memories, searchQuery, mediaFilter]);

  const totalSpreads = Math.max(1, Math.ceil(filteredMemories.length / 2));

  // Sync open state with store
  useEffect(() => {
    if (state.diaryOpen !== open) setOpen(state.diaryOpen);
  }, [state.diaryOpen, open]);

  // Sync spread with store
  useEffect(() => {
    if (state.currentPage !== undefined && state.diaryOpen) {
      setSpread(state.currentPage);
    }
  }, [state.currentPage, state.diaryOpen]);

  const openDiary = () => {
    setOpen(true);
    dispatch({ type: ACTIONS.TOGGLE_DIARY, payload: true });
  };

  const closeDiary = () => {
    setOpen(false);
    setSpread(0);
    setShowSearch(false);
    dispatch({ type: ACTIONS.TOGGLE_DIARY, payload: false });
  };

  const flipPage = useCallback((dir) => {
    if (flipping) return;
    if (dir === 'next' && spread >= totalSpreads - 1) return;
    if (dir === 'prev' && spread <= 0) return;

    setFlipSide(dir === 'next' ? 'right' : 'left');
    setFlipping(true);

    setTimeout(() => {
      setSpread(s => dir === 'next' ? s + 1 : s - 1);
      setFlipping(false);
      setFlipSide(null);
    }, 600);
  }, [flipping, spread, totalSpreads]);

  // Keyboard Navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') flipPage('next');
      if (e.key === 'ArrowLeft') flipPage('prev');
      if (e.key === 'Escape') closeDiary();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, flipPage]);

  const leftIndex = spread * 2;
  const rightIndex = spread * 2 + 1;
  const leftMemory = filteredMemories[leftIndex];
  const rightMemory = filteredMemories[rightIndex];

  /* -------- CLOSED BOOK VIEW -------- */
  if (!open) {
    return (
      <div className={styles.scene}>
        <Diary3DCanvas isOpen={false} onToggle={openDiary} memoryCount={memories.length} />

        <div style={{ marginTop: '14px', textAlign: 'center' }}>
          <button onClick={openDiary} className="btn-gold" style={{ fontSize: '0.95rem', padding: '10px 28px' }}>
            📖 Open Memory Diary ({memories.length} {memories.length === 1 ? 'Page' : 'Pages'})
          </button>
        </div>
      </div>
    );
  }

  /* -------- OPENED BOOK VIEW -------- */
  return (
    <div className={styles.scene}>
      {/* "On This Day" Memory Banner */}
      {onThisDayMemories.length > 0 && (
        <div style={{
          width: '100%',
          marginBottom: '10px',
          padding: '10px 18px',
          background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(154,112,32,0.15))',
          border: '1px solid rgba(201,168,76,0.4)',
          borderRadius: '12px',
          color: 'var(--gold-light)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>🎉 <strong>On This Day Reminder:</strong> You have {onThisDayMemories.length} memory recorded on this day!</span>
          <button onClick={() => {
            const idx = memories.findIndex(m => m.id === onThisDayMemories[0].id);
            if (idx >= 0) setSpread(Math.floor(idx / 2));
          }} style={{ background: 'var(--gold)', color: '#0d0705', border: 'none', padding: '4px 12px', borderRadius: '12px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
            Jump to Memory
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar inside Diary */}
      {showSearch && (
        <div style={{
          width: '100%',
          marginBottom: '12px',
          padding: '12px 18px',
          background: 'rgba(15, 8, 3, 0.95)',
          border: '1px solid rgba(201, 168, 76, 0.3)',
          borderRadius: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSpread(0); }}
            placeholder="Search diary pages by title, text, tags, location..."
            style={{
              flex: 1, minWidth: '200px', padding: '8px 14px',
              background: 'rgba(255,248,235,0.06)', border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '8px', color: 'var(--cream)', fontSize: '0.85rem',
            }}
          />

          <select
            value={mediaFilter}
            onChange={e => { setMediaFilter(e.target.value); setSpread(0); }}
            style={{
              padding: '8px 12px', background: 'rgba(255,248,235,0.06)',
              border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px',
              color: 'var(--gold-light)', fontSize: '0.82rem',
            }}
          >
            <option value="all">All Media Types</option>
            <option value="favorites">★ Favorites</option>
            <option value="images">🖼 Images</option>
            <option value="audio">🎵 Audio</option>
            <option value="video">🎬 Videos</option>
            <option value="pdf">📄 Documents</option>
          </select>

          <button onClick={() => { setSearchQuery(''); setMediaFilter('all'); }} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
            Reset
          </button>
        </div>
      )}

      {/* Main 3D Opened Book Spread */}
      <div className={styles.bookOpen}>

        {/* Close Button */}
        <button className={styles.closeBtn} onClick={closeDiary} title="Close Diary (Esc)">✕</button>

        {/* Action Controls: Search & Write */}
        <div style={{ position: 'absolute', top: '14px', right: '18px', display: 'flex', gap: '8px', zIndex: 20 }}>
          <button
            onClick={() => setShowSearch(v => !v)}
            style={{
              background: showSearch ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.15)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold-light)',
              padding: '7px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⌕ {showSearch ? 'Hide Search' : 'Search Pages'}
          </button>

          <button className={styles.writeBtn} onClick={() => setView('create')}>
            ✦ Create Memory
          </button>
        </div>

        {/* Left Page */}
        <div className={`${styles.pageLeft} ${flipping && flipSide === 'left' ? styles.pageFlipPrev : ''}`}>
          {leftMemory
            ? <DiaryPage memory={leftMemory} pageIndex={leftIndex} />
            : <EmptyPage msg={memories.length === 0 ? "Your diary is empty. Click 'Create Memory' to write your first entry." : "This page is waiting to be filled."} />
          }
        </div>

        {/* Middle Spine Fold */}
        <div className={styles.openSpine} />

        {/* Right Page */}
        <div className={`${styles.pageRight} ${flipping && flipSide === 'right' ? styles.pageFlipNext : ''}`}>
          {rightMemory
            ? <DiaryPage memory={rightMemory} pageIndex={rightIndex} />
            : <EmptyPage msg="The story continues on the next page..." />
          }
        </div>

        {/* Page Navigation Controls */}
        <div className={styles.navBar}>
          <button
            className={styles.navBtn}
            onClick={() => flipPage('prev')}
            disabled={spread === 0 || flipping}
            title="Previous Page (←)"
          >
            ‹
          </button>

          <div className={styles.pageIndicator}>
            Spread {spread + 1} of {totalSpreads}
          </div>

          <button
            className={styles.navBtn}
            onClick={() => flipPage('next')}
            disabled={spread >= totalSpreads - 1 || flipping}
            title="Next Page (→)"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
