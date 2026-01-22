import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Promise timeout helper to avoid hanging spinners when Supabase calls stall
async function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper: Get current user profile from Supabase
 */
export async function getCurrentUserProfile() {
  try {
    const { data: { session }, error: sessionError } = await withTimeout(
      supabase.auth.getSession(),
      7000,
      'auth getSession (profile)'
    );

    if (sessionError) throw sessionError;
    const user = session?.user;
    if (!user) return null;

    // Fetch profile if it exists; 406 (no row) is expected when the row is missing
    const { data: profile, error: profileError } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),
      7000,
      'fetch profile'
    );

    if (!profileError && profile) {
      return profile;
    }

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }

    // Return null gracefully if profile doesn't exist or fetch fails
    // The profile is optional for the editor to function
    return null;
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
}

/**
 * Helper: Fetch user's items from Supabase
 */
export async function getUserItems() {
  try {
    const { data: { user }, error: authError } = await withTimeout(
      supabase.auth.getUser(),
      7000,
      'auth getUser (items)'
    );
    
    if (authError) throw authError;
    if (!user) return [];

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching items:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserItems:', error);
    return [];
  }
}

/**
 * Helper: Create a new item
 */
export async function createItem(title, description) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('items')
      .insert([
        {
          user_id: user.id,
          title,
          description,
          status: 'active'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper: Get or create user document
 * Returns document ID and content
 */
export async function getUserDocument(userId) {
  try {
    // Prefer caller-provided user ID to avoid extra auth round trips on refresh
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user }, error: authError } = await withTimeout(
        supabase.auth.getUser(),
        7000,
        'auth getUser (document)'
      );
      if (authError) throw authError;
      effectiveUserId = user?.id;
    }

    if (!effectiveUserId) return null;

    // Fetch latest document for this user (safe even if none exists)
    const { data, error: fetchError } = await withTimeout(
      supabase
      .from('documents')
      .select('id,user_id,title,content,created_at,updated_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: true })
      .limit(1),
      7000,
      'fetch document'
    );

    if (fetchError) {
      console.error('Error fetching document:', fetchError);
    }

    if (data && data.length > 0) {
      return data[0];
    }

    // Create new document if none exists
    const { data: newDoc, error: insertError } = await withTimeout(
      supabase
      .from('documents')
      .insert([
        {
          user_id: effectiveUserId,
          title: 'Untitled Document',
          content: { type: 'doc', content: [] },
        }
      ])
      .select('id,user_id,title,content,created_at,updated_at')
      .single(),
      7000,
      'create document'
    );

    if (insertError) {
      console.error('Error creating document:', insertError);
      return null;
    }

    return newDoc;
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.warn('getUserDocument aborted');
      return null;
    }
    console.error('Error in getUserDocument:', error);
    return null;
  }
}

/**
 * Helper: Save document content
 */
export async function saveDocument(documentId, content) {
  try {
    const { data: { user }, error: authError } = await withTimeout(
      supabase.auth.getUser(),
      7000,
      'auth getUser (save)'
    );
    if (authError) throw authError;
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await withTimeout(
      supabase
      .from('documents')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('user_id', user.id),
      7000,
      'update document'
    );

    if (error) {
      console.error('Error saving document:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.warn('saveDocument aborted');
      return { success: false, error: 'aborted' };
    }
    console.error('Error in saveDocument:', error);
    return { success: false, error: error.message };
  }
}
