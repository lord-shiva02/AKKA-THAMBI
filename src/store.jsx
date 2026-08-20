// ===== Centralized Application State Store =====
import { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state
const storedUser = localStorage.getItem('memoir_user');
const parsedUser = storedUser ? JSON.parse(storedUser) : null;

const initialState = {
  // Authentication State
  isAuthenticated: localStorage.getItem('memoir_authenticated') === 'true' || !!parsedUser,
  currentUser: parsedUser,

  // Navigation & View
  view: 'home', // 'home' | 'create' | 'admin'
  diaryOpen: false,
  currentPage: 0,
  totalPages: 0,
  theme: localStorage.getItem('memoir_theme') || 'dark', // 'dark' | 'light'

  // Admin Auth State
  isAdminAuthenticated: localStorage.getItem('memoir_admin_auth') === 'true',
  adminTab: 'overview', // 'overview' | 'memories' | 'media' | 'users' | 'backup' | 'analytics' | 'ai' | 'translation' | 'storage' | 'logs' | 'security'

  // Memories & Selected Memory
  memories: [],
  selectedMemory: null,
  searchQuery: '',

  // UI Notifications & Loaders
  isLoading: false,
  loadingMessage: '',
  toasts: [],

  // Settings
  settings: {
    theme: 'dark',
    autoTranslate: true,
    removeFillerWords: true,
    soundEffects: true,
    pageFlipSound: true,
    locationEnabled: true,
    aiModel: 'built-in', // 'built-in' | 'gemini'
    storyTone: 'emotional', // 'emotional' | 'poetic' | 'concise'
  },
};

// Action types
export const ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_VIEW: 'SET_VIEW',
  TOGGLE_DIARY: 'TOGGLE_DIARY',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_THEME: 'SET_THEME',
  SET_ADMIN_AUTH: 'SET_ADMIN_AUTH',
  SET_ADMIN_TAB: 'SET_ADMIN_TAB',
  SET_MEMORIES: 'SET_MEMORIES',
  ADD_MEMORY: 'ADD_MEMORY',
  UPDATE_MEMORY: 'UPDATE_MEMORY',
  DELETE_MEMORY: 'DELETE_MEMORY',
  SET_SELECTED_MEMORY: 'SET_SELECTED_MEMORY',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_LOADING: 'SET_LOADING',
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
};

// Reducer
function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOGIN_SUCCESS: {
      const isAdminUser = action.payload?.role === 'admin';
      localStorage.setItem('memoir_authenticated', 'true');
      localStorage.setItem('memoir_user', JSON.stringify(action.payload));
      if (isAdminUser) {
        localStorage.setItem('memoir_admin_auth', 'true');
      }
      return {
        ...state,
        isAuthenticated: true,
        currentUser: action.payload,
        isAdminAuthenticated: isAdminUser ? true : state.isAdminAuthenticated,
        view: isAdminUser ? 'admin' : 'home',
      };
    }

    case ACTIONS.LOGOUT:
      localStorage.removeItem('memoir_authenticated');
      localStorage.removeItem('memoir_user');
      return {
        ...state,
        isAuthenticated: false,
        currentUser: null,
        view: 'home',
      };

    case ACTIONS.SET_VIEW:
      return { ...state, view: action.payload };

    case ACTIONS.TOGGLE_DIARY:
      return { ...state, diaryOpen: action.payload ?? !state.diaryOpen };

    case ACTIONS.SET_CURRENT_PAGE:
      return { ...state, currentPage: action.payload };

    case ACTIONS.SET_THEME:
      localStorage.setItem('memoir_theme', action.payload);
      return { ...state, theme: action.payload };

    case ACTIONS.SET_ADMIN_AUTH:
      localStorage.setItem('memoir_admin_auth', action.payload ? 'true' : 'false');
      return { ...state, isAdminAuthenticated: action.payload };

    case ACTIONS.SET_ADMIN_TAB:
      return { ...state, adminTab: action.payload };

    case ACTIONS.SET_MEMORIES:
      return { ...state, memories: action.payload, totalPages: action.payload.length };

    case ACTIONS.ADD_MEMORY: {
      const newMemories = [action.payload, ...state.memories];
      return {
        ...state,
        memories: newMemories,
        totalPages: newMemories.length,
        currentPage: 0,
        diaryOpen: true,
      };
    }

    case ACTIONS.UPDATE_MEMORY: {
      const updated = state.memories.map(m =>
        m.id === action.payload.id ? { ...m, ...action.payload } : m
      );
      return { ...state, memories: updated };
    }

    case ACTIONS.DELETE_MEMORY: {
      const filtered = state.memories.filter(m => m.id !== action.payload);
      return {
        ...state,
        memories: filtered,
        totalPages: filtered.length,
        currentPage: Math.max(0, state.currentPage - 1),
      };
    }

    case ACTIONS.SET_SELECTED_MEMORY:
      return { ...state, selectedMemory: action.payload };

    case ACTIONS.SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.loading,
        loadingMessage: action.payload.message || '',
      };

    case ACTIONS.ADD_TOAST: {
      const toast = {
        id: Date.now() + Math.random(),
        ...action.payload,
      };
      return { ...state, toasts: [...state.toasts, toast] };
    }

    case ACTIONS.REMOVE_TOAST:
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    case ACTIONS.UPDATE_SETTINGS:
      return { ...state, settings: { ...state.settings, ...action.payload } };

    default:
      return state;
  }
}

// Context
const StoreContext = createContext(null);

// Provider
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loginUser = useCallback((user) => {
    dispatch({ type: ACTIONS.LOGIN_SUCCESS, payload: user });
  }, []);

  const logoutUser = useCallback(() => {
    dispatch({ type: ACTIONS.LOGOUT });
  }, []);

  const setView = useCallback((view) => dispatch({ type: ACTIONS.SET_VIEW, payload: view }), []);
  const toggleDiary = useCallback((open) => dispatch({ type: ACTIONS.TOGGLE_DIARY, payload: open }), []);
  const addToast = useCallback((toast) => dispatch({ type: ACTIONS.ADD_TOAST, payload: toast }), []);
  const removeToast = useCallback((id) => dispatch({ type: ACTIONS.REMOVE_TOAST, payload: id }), []);
  const setLoading = useCallback((loading, message = '') =>
    dispatch({ type: ACTIONS.SET_LOADING, payload: { loading, message } }), []);
  const toggleTheme = useCallback(() => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    dispatch({ type: ACTIONS.SET_THEME, payload: nextTheme });
  }, [state.theme]);

  return (
    <StoreContext.Provider value={{
      state,
      dispatch,
      loginUser,
      logoutUser,
      setView,
      toggleDiary,
      addToast,
      removeToast,
      setLoading,
      toggleTheme
    }}>
      {children}
    </StoreContext.Provider>
  );
}

// Hook
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

