import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

function logSupabaseError(context, error) {
  if (!error) return;
  console.error(`${context}: ${error.message || 'Unknown error'}`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

function getLastOpenedDocumentId(userId) {
  try {
    if (!userId) return null;
    return window.localStorage.getItem(`notepulse:lastDocId:${userId}`);
  } catch {
    return null;
  }
}

function setLastOpenedDocumentId(userId, documentId) {
  try {
    if (!userId || !documentId) return;
    window.localStorage.setItem(`notepulse:lastDocId:${userId}`, documentId);
  } catch {
    // ignore
  }
}

function clearLastOpenedDocumentId(userId) {
  try {
    if (!userId) return;
    window.localStorage.removeItem(`notepulse:lastDocId:${userId}`);
  } catch {
    // ignore
  }
}

/**
 * Helper: Clear all NotePulse localStorage keys (for all users)
 * Useful for debugging stale state issues
 */
export function clearAllNotePulseStorage() {
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('notepulse:')) {
        keys.push(key);
      }
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
    console.log('Cleared NotePulse storage keys:', keys.length);
  } catch (e) {
    console.warn('Failed to clear NotePulse storage:', e);
  }
}

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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    const user = session?.user;
    if (!user) return null;

    // Fetch profile (no timeout - it's non-critical)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileError && profile) {
      return profile;
    }

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }

    // If profile doesn't exist, try to create it (helps Invite-by-email).
    // This is safe under RLS when profiles_insert_own exists.
    try {
      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .maybeSingle();

      if (insertError) {
        logSupabaseError('Error creating profile row', insertError);
        return null;
      }

      return created || null;
    } catch (e) {
      console.error('Error attempting to create profile:', e);
      return null;
    }
  } catch (error) {
    // Profile is optional, don't log timeout errors
    if (error?.message?.includes('Timeout')) {
      return null;
    }
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
    // Ensure we actually have an authenticated session; otherwise inserts will 403 under RLS.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      logSupabaseError('Error getting session (document)', sessionError);
    }
    if (!session?.user) {
      console.error('No active session - cannot fetch/create document');
      return null;
    }

    // IMPORTANT: Always use the session user id for document operations.
    // RLS policies check auth.uid(), and caller-provided ids can mismatch and cause 403.
    const effectiveUserId = session.user.id;

    // Prefer last opened document (helps two tabs/browsers land on same doc)
    const lastDocId = getLastOpenedDocumentId(effectiveUserId);
    if (lastDocId) {
      const { data: lastDoc, error: lastDocError } = await withTimeout(
        supabase
          .from('documents')
          .select('id,user_id,title,content,created_at,updated_at,last_edited_by')
          .eq('id', lastDocId)
          .maybeSingle(),
        7000,
        'fetch last opened document'
      );

      if (!lastDocError && lastDoc) {
        setLastOpenedDocumentId(effectiveUserId, lastDoc.id);
        return lastDoc;
      }

      if (lastDocError) {
        // Non-fatal: fall back to default document selection
        logSupabaseError('Error fetching last opened document', lastDocError);
        // Clear the stale hint so future loads don't get stuck on a 403/missing doc
        clearLastOpenedDocumentId(effectiveUserId);
      }

      if (!lastDoc) {
        // If the hinted doc no longer exists, clear the hint
        clearLastOpenedDocumentId(effectiveUserId);
      }
    }

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
      logSupabaseError('Error fetching document', fetchError);
    }

    if (data && data.length > 0) {
      setLastOpenedDocumentId(effectiveUserId, data[0].id);
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
      logSupabaseError('Error creating document', insertError);
      return null;
    }

    // Converge on a single default doc even if two sessions created one at the same time.
    // Always return the earliest created document for this user.
    const { data: canonical, error: canonicalError } = await withTimeout(
      supabase
        .from('documents')
        .select('id,user_id,title,content,created_at,updated_at,last_edited_by')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: true })
        .limit(1),
      7000,
      'fetch canonical document'
    );

    if (canonicalError) {
      logSupabaseError('Error fetching canonical document', canonicalError);
      setLastOpenedDocumentId(effectiveUserId, newDoc.id);
      return newDoc;
    }

    const chosen = canonical?.[0] || newDoc;
    setLastOpenedDocumentId(effectiveUserId, chosen.id);
    return chosen;
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
 * Helper: Fetch a document by id (used for shared/collab docs)
 */
export async function getDocumentById(documentId) {
  try {
    if (!documentId) return null;

    const { data, error } = await withTimeout(
      supabase
        .from('documents')
        .select('id,user_id,title,content,created_at,updated_at,last_edited_by')
        .eq('id', documentId)
        .maybeSingle(),
      7000,
      'fetch document by id'
    );

    if (error) {
      logSupabaseError('Error fetching document by id', error);
      return null;
    }

    if (data?.user_id) {
      setLastOpenedDocumentId(data.user_id, data.id);
    }
    return data || null;
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.warn('getDocumentById aborted');
      return null;
    }
    console.error('Error in getDocumentById:', error);
    return null;
  }
}

/**
 * Helper: Save document content
 */
export async function saveDocument(documentId, content) {
  try {
    // Get session instead of user to avoid timeout
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) return { success: false, error: 'Not authenticated' };

    const user = session.user;
    console.log('💾 Attempting to save document:', documentId, 'user:', user.id);

    const { error } = await withTimeout(
      supabase
      .from('documents')
      .update({
        content,
        last_edited_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId),
      15000,
      'update document'
    );

    if (error) {
      console.error('❌ Save failed:', error);
      logSupabaseError('Error saving document', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Document saved successfully');
    return { success: true };
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.warn('saveDocument aborted');
      return { success: false, error: 'Save aborted' };
    }
    if (error?.message?.includes('Timeout')) {
      console.error('❌ Save timeout - check network connection');
      return { success: false, error: 'Save timeout - please retry' };
    }
    console.error('Error in saveDocument:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Helper: Save a document snapshot to history
 */
export async function saveDocumentSnapshot(documentId, content, snapshotType = 'manual') {
  try {
    // Get session instead of user to avoid timeout
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) {
      console.error('Not authenticated - cannot save snapshot');
      return { success: false, error: 'Not authenticated' };
    }

    const user = session.user;
    console.log('Saving snapshot for document:', documentId, 'user:', user.id);

    const { data, error } = await supabase
      .from('documents_history')
      .insert([
        {
          document_id: documentId,
          user_id: user.id,
          content,
          snapshot_type: snapshotType,
          note: `${snapshotType} snapshot`,
        }
      ]);

    if (error) {
      logSupabaseError('Supabase error saving snapshot', error);
      return {
        success: false,
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      };
    }

    console.log('Snapshot saved successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Exception in saveDocumentSnapshot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper: Get document history snapshots
 */
export async function getDocumentHistory(documentId, limit = 20) {
  try {
    console.log('📜 Fetching history for document:', documentId);
    const { data, error } = await supabase
      .from('documents_history')
      .select('id, content, snapshot_type, created_at, user_id')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ History fetch failed:', error);
      logSupabaseError('Error fetching history', error);
      return { data: [], error };
    }

    console.log('✅ History loaded:', data?.length || 0, 'snapshots');
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error in getDocumentHistory:', error);
    return { data: [], error };
  }
}

/**
 * Helper: Upsert presence for current user
 * Non-blocking - errors are logged but don't propagate
 */
export async function upsertPresence(documentId, status = 'online') {
  try {
    // Get session instead of user to avoid timeout
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) return { success: false };

    const user = session.user;

    // Fire and forget - don't wait for response to avoid blocking
    supabase
      .from('presence')
      .upsert({
        user_id: user.id,
        document_id: documentId,
        status,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'user_id,document_id'
      })
      .then(({ error }) => {
        if (error) {
          // Log but don't throw - presence is non-critical
          console.debug('Presence update failed:', error.message);
        }
      })
      .catch(() => {
        // Silently ignore presence errors
      });

    return { success: true };
  } catch (error) {
    // Silently fail - presence is not critical for core functionality
    console.debug('Error in upsertPresence:', error.name);
    return { success: false };
  }
}

/**
 * Helper: Get active presence for a document
 */
export async function getDocumentPresence(documentId) {
  try {
    // Get presence from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('presence')
      .select('user_id, status, last_seen')
      .eq('document_id', documentId)
      .gte('last_seen', fiveMinutesAgo)
      .eq('status', 'online');

    if (error) {
      logSupabaseError('Error fetching presence', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDocumentPresence:', error);
    return [];
  }
}

function normalizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

/**
 * Helper: Lookup a profile by email (for inviting collaborators)
 */
export async function getProfileByEmail(email) {
  try {
    const normalized = normalizeEmail(email);
    if (!normalized) return { profile: null, error: 'Missing email' };

    console.log('🔍 Looking up profile for email:', normalized);

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,created_at')
      .ilike('email', normalized)
      .maybeSingle();

    if (error) {
      console.error('❌ Profile lookup failed:', error);
      logSupabaseError('Error looking up profile by email', error);
      return { profile: null, error: error.message };
    }

    if (!data) {
      console.warn('⚠️ No profile found for email:', normalized);
      return { profile: null, error: 'No user found with that email' };
    }

    console.log('✅ Profile found:', data.id);
    return { profile: data, error: null };
  } catch (error) {
    console.error('Error in getProfileByEmail:', error);
    return { profile: null, error: error.message };
  }
}

/**
 * Helper: Invite (upsert) a collaborator by email.
 * Requires the current user to be the document owner (enforced by RLS).
 */
export async function inviteCollaboratorByEmail(documentId, email, role = 'editor') {
  try {
    if (!documentId) return { success: false, error: 'Missing document id' };

    const normalizedRole = role === 'viewer' ? 'viewer' : 'editor';
    console.log('📧 Inviting collaborator:', email, 'as', normalizedRole);

    const { profile, error: lookupError } = await getProfileByEmail(email);
    if (lookupError) return { success: false, error: lookupError };

    const { data, error } = await supabase
      .from('document_collaborators')
      .upsert(
        {
          document_id: documentId,
          user_id: profile.id,
          role: normalizedRole,
        },
        {
          onConflict: 'document_id,user_id',
        }
      )
      .select('id,document_id,user_id,role,created_at')
      .maybeSingle();

    if (error) {
      console.error('❌ Invite failed:', error);
      logSupabaseError('Error inviting collaborator', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Collaborator invited successfully');
    return { success: true, data: data || null };
  } catch (error) {
    console.error('Error in inviteCollaboratorByEmail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper: List collaborators for a document.
 */
export async function getDocumentCollaborators(documentId) {
  try {
    if (!documentId) return [];

    const { data, error } = await supabase
      .from('document_collaborators')
      .select('user_id, role, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      logSupabaseError('Error fetching collaborators', error);
      return [];
    }

    const rows = data || [];
    const ids = rows.map((r) => r.user_id).filter(Boolean);
    if (ids.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,email,full_name')
      .in('id', ids);

    if (profilesError) {
      logSupabaseError('Error fetching collaborator profiles', profilesError);
    }

    const byId = new Map((profiles || []).map((p) => [p.id, p]));
    return rows.map((r) => ({
      ...r,
      profile: byId.get(r.user_id) || null,
    }));
  } catch (error) {
    console.error('Error in getDocumentCollaborators:', error);
    return [];
  }
}
