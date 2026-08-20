// ===== Supabase Client — Auth, Session Management & Profile Sync =====
import { createClient } from '@supabase/supabase-js';

// Read environment variables (set in .env file)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create the Supabase client (singleton)
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ===== Configuration Check =====
export function isSupabaseConfigured() {
  return !!supabase;
}

// ===== SESSION MANAGEMENT =====

/** Get the current authenticated session */
export async function getSession() {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  return session;
}

/** Get the current authenticated user */
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

/** Get the user profile from the users table (includes role) */
export async function getUserProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
  return data;
}

/** Check if the current user has admin role */
export async function isAdmin() {
  if (!supabase) return false;
  const user = await getCurrentUser();
  if (!user) return false;
  const profile = await getUserProfile(user.id);
  return profile?.role === 'admin';
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      let profile = null;
      if (session?.user) {
        profile = await getUserProfile(session.user.id);

        // If profile doesn't exist yet (trigger may be delayed), create one
        if (!profile) {
          const { data } = await supabase.from('users').upsert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
              || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url
              || session.user.user_metadata?.picture || '',
            auth_type: session.user.app_metadata?.provider || 'email',
            last_login_at: new Date().toISOString(),
          }, { onConflict: 'id' }).select().single();
          profile = data;
        } else {
          // Update last login
          await supabase.from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', session.user.id);
        }
      }

      callback(event, session, profile);
    }
  );
  return () => subscription.unsubscribe();
}

// ===== AUTHENTICATION METHODS =====

/** Sign in with Google OAuth */
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
  return data;
}

/** Sign in with Email & Password */
export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/** Sign up with Email & Password */
export async function signUpWithEmail(email, password, name = '') {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name || email.split('@')[0],
      },
    },
  });
  if (error) throw error;
  return data;
}

/** Send password reset email */
export async function resetPassword(email) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  });
  if (error) throw error;
  return data;
}

/** Update password (after reset) */
export async function updatePassword(newPassword) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

/** Sign out */
export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ===== ACTIVITY LOGGING =====

/** Log an activity event to the activity_logs table */
export async function logActivity(action, details = {}) {
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) return;
  try {
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      details,
    });
  } catch (err) {
    console.error('Activity log error:', err);
  }
}

/** Get activity logs for the current user */
export async function getActivityLogs(limit = 100) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

/** Clear activity logs for the current user */
export async function clearActivityLogs() {
  if (!supabase) return false;
  const user = await getCurrentUser();
  if (!user) return false;
  try {
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .eq('user_id', user.id);
    return !error;
  } catch {
    return false;
  }
}

// ===== SETTINGS =====

/** Load all settings for the current user */
export async function loadUserSettings() {
  if (!supabase) return {};
  const user = await getCurrentUser();
  if (!user) return {};
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', user.id);
    if (error) throw error;
    const settings = {};
    (data || []).forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  } catch {
    return {};
  }
}

/** Save a setting for the current user */
export async function saveUserSetting(key, value) {
  if (!supabase) return false;
  const user = await getCurrentUser();
  if (!user) return false;
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        key,
        value,
      }, { onConflict: 'user_id,key' });
    return !error;
  } catch {
    return false;
  }
}
