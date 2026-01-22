export default function Header({ onNavigate }) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  const handleSignIn = async () => {
    // TODO: Integrate Supabase auth modal
    // For scaffold, placeholder
    setIsSignedIn(true);
  };

  const handleSignOut = () => {
    // TODO: Integrate Supabase sign out
    setIsSignedIn(false);
  };

  return (
    <header className="header">
      <h1 className="app-title">NotePulse</h1>
      <div className="auth-buttons">
        {isSignedIn ? (
          <button onClick={handleSignOut}>Sign Out</button>
        ) : (
          <button onClick={handleSignIn}>Sign In</button>
        )}
      </div>
    </header>
  );
}

import { useState } from 'react';
