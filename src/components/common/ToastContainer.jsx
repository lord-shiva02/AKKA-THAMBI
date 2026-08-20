// ===== Toast Notification Component =====
import { useEffect } from 'react';
import { useStore, ACTIONS } from '../../store';

function Toast({ toast }) {
  const { dispatch } = useStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: ACTIONS.REMOVE_TOAST, payload: toast.id });
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dispatch]);

  const icons = { success: '✓', error: '✕', info: '◆' };

  return (
    <div className={`toast toast-${toast.type || 'info'}`}
      style={{ animation: 'fadeInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{icons[toast.type] || '◆'}</span>
      <span>{toast.message}</span>
      <button
        onClick={() => dispatch({ type: ACTIONS.REMOVE_TOAST, payload: toast.id })}
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          opacity: 0.7,
          fontSize: '1rem',
          padding: '0 4px',
        }}
      >×</button>
    </div>
  );
}

export default function ToastContainer() {
  const { state } = useStore();

  if (state.toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {state.toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
