// ===== Memory Service — IndexedDB + LocalStorage Hybrid Database =====
import { openDB } from 'idb';

const DB_NAME = 'MemoirDB';
const DB_VERSION = 1;
const MEMORIES_STORE = 'memories';
const LOGS_STORE = 'activity_logs';
const SETTINGS_KEY = 'memoir_settings';

// Initialize IndexedDB
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(MEMORIES_STORE)) {
        const store = db.createObjectStore(MEMORIES_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('favorite', 'favorite');
      }
      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        const logStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp');
      }
    },
  });
}

// Generate unique ID
export function generateId() {
  return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Log activity event
export async function logActivity(action, details = {}) {
  try {
    const db = await getDB();
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    await db.put(LOGS_STORE, log);
    return log;
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Get activity logs
export async function getActivityLogs(limit = 100) {
  try {
    const db = await getDB();
    const tx = db.transaction(LOGS_STORE, 'readonly');
    const store = tx.objectStore(LOGS_STORE);
    const logs = await store.getAll();
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  } catch {
    return [];
  }
}

// Clear activity logs
export async function clearActivityLogs() {
  try {
    const db = await getDB();
    const tx = db.transaction(LOGS_STORE, 'readwrite');
    await tx.objectStore(LOGS_STORE).clear();
    await tx.done;
    return true;
  } catch {
    return false;
  }
}

// Load all memories (from IndexedDB with LocalStorage fallback/sync)
export async function loadMemories() {
  try {
    const db = await getDB();
    const tx = db.transaction(MEMORIES_STORE, 'readonly');
    const store = tx.objectStore(MEMORIES_STORE);
    const memories = await store.getAll();

    // Sort by createdAt descending
    const sorted = memories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Also mirror to localStorage for quick sync if small
    try {
      const summary = sorted.map(m => ({ ...m, images: [], videos: [], audioFiles: [], documents: [] }));
      localStorage.setItem('memoir_memories_summary', JSON.stringify(summary));
    } catch {}

    return sorted;
  } catch (err) {
    console.error('IndexedDB load failed, falling back to LocalStorage:', err);
    try {
      const raw = localStorage.getItem('memoir_memories');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

// Add a new memory
export async function addMemory(memory) {
  const newMemory = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: false,
    ...memory,
  };

  try {
    const db = await getDB();
    await db.put(MEMORIES_STORE, newMemory);
    await logActivity('Memory Created', { title: newMemory.title, id: newMemory.id });
  } catch (err) {
    console.error('Failed to save to IndexedDB, falling back to LocalStorage:', err);
    try {
      const existing = JSON.parse(localStorage.getItem('memoir_memories') || '[]');
      localStorage.setItem('memoir_memories', JSON.stringify([newMemory, ...existing]));
    } catch (e) {
      console.error('LocalStorage save failed:', e);
    }
  }

  return newMemory;
}

// Update memory
export async function updateMemory(id, updates) {
  try {
    const db = await getDB();
    const existing = await db.get(MEMORIES_STORE, id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put(MEMORIES_STORE, updated);
    await logActivity('Memory Updated', { title: updated.title, id });
    return updated;
  } catch (err) {
    console.error('Failed to update memory:', err);
    return null;
  }
}

// Delete memory
export async function deleteMemory(id) {
  try {
    const db = await getDB();
    const existing = await db.get(MEMORIES_STORE, id);
    await db.delete(MEMORIES_STORE, id);
    if (existing) {
      await logActivity('Memory Deleted', { title: existing.title, id });
    }
    return true;
  } catch (err) {
    console.error('Failed to delete memory:', err);
    return false;
  }
}

// Toggle favorite status
export async function toggleFavorite(id) {
  try {
    const db = await getDB();
    const existing = await db.get(MEMORIES_STORE, id);
    if (!existing) return null;

    const updated = { ...existing, favorite: !existing.favorite };
    await db.put(MEMORIES_STORE, updated);
    return updated;
  } catch (err) {
    console.error('Failed to toggle favorite:', err);
    return null;
  }
}

// Search memories
export function searchMemories(query, memories) {
  if (!query || !query.trim()) return memories;
  const q = query.toLowerCase().trim();

  return memories.filter(m => {
    const fields = [
      m.title,
      m.aiStory,
      m.textContent,
      m.transcript,
      m.city,
      m.state,
      m.country,
      m.day,
      m.month,
      m.year,
      m.date,
      m.time,
      m.mood?.label,
      ...(m.tags || []),
      ...(m.translations ? Object.values(m.translations) : []),
    ].filter(Boolean);

    return fields.some(f => f.toString().toLowerCase().includes(q));
  });
}

// Load settings
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Save settings
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    logActivity('Settings Updated', settings);
    return true;
  } catch {
    return false;
  }
}

// Convert file to base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Format file size
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Categorize uploaded file
export function getFileCategory(file) {
  const type = file.type || '';
  const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';

  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
  return 'document';
}

// Collect current environment & location metadata
export async function getCurrentMetadata() {
  const now = new Date();
  const metadata = {
    date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    day: now.toLocaleDateString('en-US', { weekday: 'long' }),
    month: now.toLocaleDateString('en-US', { month: 'long' }),
    year: now.getFullYear().toString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    device: `${getOSName()} (${getBrowserName()})`,
    browser: getBrowserName(),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timestamp: now.toISOString(),
    latitude: null,
    longitude: null,
    city: null,
    state: null,
    country: null,
  };

  // GPS Location with reverse geocoding
  try {
    const pos = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
    });

    metadata.latitude = pos.coords.latitude.toFixed(6);
    metadata.longitude = pos.coords.longitude.toFixed(6);

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${metadata.latitude}&lon=${metadata.longitude}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const geo = await resp.json();
      metadata.city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.suburb || 'Local Area';
      metadata.state = geo.address?.state || geo.address?.region || null;
      metadata.country = geo.address?.country || null;
    } catch {
      metadata.city = 'GPS Position Recorded';
    }
  } catch {
    metadata.city = null;
  }

  return metadata;
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'Browser';
}

function getOSName() {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Device';
}

// Export database backup JSON
export async function exportDiaryData() {
  const memories = await loadMemories();
  const settings = loadSettings();
  const logs = await getActivityLogs();

  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    memoriesCount: memories.length,
    memories,
    settings,
    logs,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diary_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  await logActivity('Data Exported', { count: memories.length });
  return true;
}

// Restore database from backup JSON
export async function restoreDiaryData(jsonData) {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    if (!data.memories || !Array.isArray(data.memories)) {
      throw new Error('Invalid backup file format.');
    }

    const db = await getDB();
    const tx = db.transaction(MEMORIES_STORE, 'readwrite');
    const store = tx.objectStore(MEMORIES_STORE);

    for (const mem of data.memories) {
      await store.put(mem);
    }
    await tx.done;

    if (data.settings) {
      saveSettings(data.settings);
    }

    await logActivity('Data Restored', { count: data.memories.length });
    return data.memories;
  } catch (err) {
    console.error('Restore failed:', err);
    throw err;
  }
}

// Clear all data
export async function resetDiaryDatabase() {
  try {
    const db = await getDB();
    const tx = db.transaction([MEMORIES_STORE, LOGS_STORE], 'readwrite');
    await tx.objectStore(MEMORIES_STORE).clear();
    await tx.objectStore(LOGS_STORE).clear();
    await tx.done;
    localStorage.removeItem('memoir_memories');
    localStorage.removeItem('memoir_memories_summary');
    await logActivity('Database Reset', {});
    return true;
  } catch {
    return false;
  }
}
