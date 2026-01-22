import { useState, useEffect } from 'react';
import { supabase, getCurrentUserProfile } from './supabaseClient';
import Auth from './components/Auth';
import Editor from './components/Editor';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    checkUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      }
    } catch (err) {
      console.error('Error checking user:', err);
    } finally {
      setLoading(false);
    }
  };

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
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
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
