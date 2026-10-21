import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Hero } from '../types/draft';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect whether valid credentials are provided
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Fallback dummy client if credentials aren't configured yet to prevent runtime crashes
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-domain.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export interface SavedDraft {
  id: string;
  user_id: string;
  title: string;
  map_trait: string;
  blue_picks: (Hero | null)[];
  blue_bans: (Hero | null)[];
  red_picks: (Hero | null)[];
  red_bans: (Hero | null)[];
  notes?: string;
  created_at: string;
}

export type CreateDraftPayload = Omit<SavedDraft, 'id' | 'created_at'>;

/**
 * OAuth Sign In (Discord or Google)
 */
export async function signInWithOAuth(provider: 'discord' | 'google') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Sign Out
 */
export async function signOut() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Fetch all drafts for the authenticated user
 */
export async function fetchUserDrafts(userId: string): Promise<SavedDraft[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching drafts from Supabase:', error);
    throw error;
  }

  return (data as SavedDraft[]) || [];
}

/**
 * Insert a new draft for the current user
 */
export async function insertDraft(payload: CreateDraftPayload): Promise<SavedDraft> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  const { data, error } = await supabase
    .from('drafts')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error saving draft to Supabase:', error);
    throw error;
  }

  return data as SavedDraft;
}

/**
 * Delete a draft by ID
 */
export async function deleteDraftById(draftId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('drafts')
    .delete()
    .eq('id', draftId);

  if (error) {
    console.error('Error deleting draft from Supabase:', error);
    throw error;
  }
}
