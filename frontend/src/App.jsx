import { useState, useEffect } from 'react';
import { supabase, getCurrentUserProfile } from './supabaseClient';
import Auth from './components/Auth';
import Editor from './components/Editor';
import Debug from './pages/Debug';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let authCompleted = false;

    // Listen for auth state changes (this will handle both initial load and state changes)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authCompleted = true;
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Fallback timeout to prevent infinite loading (extended to 10 seconds)
    const timeoutId = setTimeout(() => {
      if (!authCompleted) {
        console.warn('Auth state change listener did not complete within 10 seconds, proceeding anyway');
        setLoading(false);
      }
    }, 10000);

    return () => {
      clearTimeout(timeoutId);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loadProfile = async (currentUser) => {
    try {
      const profileData = await getCurrentUserProfile();
      setProfile(profileData);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handleAuthSuccess = async (authUser) => {
    setUser(authUser);
    await loadProfile(authUser);
  };

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out...');
      
      // Clear last opened doc for current user to avoid stale state on next login
      try {
        const current = user?.id;
        if (current) {
          window.localStorage.removeItem(`notepulse:lastDocId:${current}`);
        }
      } catch {
        // ignore
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
        throw error;
      }
      
      console.log('Sign out successful');
      setUser(null);
      setProfile(null);
      
      // Force reload to clear all state
      setTimeout(() => window.location.reload(), 100);
    } catch (err) {
      console.error('Sign out error:', err);
      alert('Sign out failed: ' + (err.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (window.location.pathname === '/debug') {
    return <Debug />;
  }

  return (
    <div className="app">
      {!user ? (
        <Auth onAuthSuccess={handleAuthSuccess} />
      ) : (
        <Editor user={user} profile={profile} onSignOut={handleSignOut} />
      )}
    </div>
  );
}
