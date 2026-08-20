// ===== Home Page — 3D Luxury Leather Diary Centered =====
import { useStore } from '../../store';
import DiaryBook from '../diary/DiaryBook';

export default function HomePage() {
  const { state } = useStore();

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '72px',
      paddingBottom: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Radial Glow */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: state.theme === 'dark'
          ? 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.01) 45%, transparent 70%)'
          : 'radial-gradient(circle, rgba(139,90,43,0.08) 0%, rgba(139,90,43,0.01) 45%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* 3D Diary — Heart of the Application */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <DiaryBook />
      </div>
    </div>
  );
}
