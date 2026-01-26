import { useState, useEffect } from 'react';
import { getDocumentPresence } from '../supabaseClient';

export default function PresencePanel({ provider, documentId }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [mode, setMode] = useState('awareness');

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;
    if (!awareness) return;

    const updatePresence = () => {
      const states = awareness.getStates();
      const users = [];
      
      states.forEach((state, clientId) => {
        if (state.user) {
          users.push({
            clientId,
            name: state.user.name || 'Anonymous',
            color: state.user.color || '#999',
          });
        }
      });

      setActiveUsers(users);
      setMode('awareness');
    };

    // Initial update
    updatePresence();

    // Listen to awareness changes
    awareness.on('change', updatePresence);

    return () => {
      awareness.off('change', updatePresence);
    };
  }, [provider]);

  // Fallback: fetch from Supabase if no awareness users
  useEffect(() => {
    if (activeUsers.length > 0 || !documentId) return;

    const fetchPresence = async () => {
      const presenceData = await getDocumentPresence(documentId);
      if (presenceData.length > 0) {
        const users = presenceData.map((p, i) => ({
          clientId: p.user_id,
          name: p.user_id.substring(0, 8),
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        }));
        setActiveUsers(users);
        setMode('supabase');
      }
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [documentId, activeUsers.length]);

  return (
    <div className="presence-panel">
      <h3>
        Active ({activeUsers.length})
        {mode === 'supabase' ? ' (fallback)' : ''}
      </h3>
      {!provider && (
        <div className="presence-empty">Offline (not connected)</div>
      )}
      {provider && activeUsers.length === 0 && (
        <div className="presence-empty">No collaborators yet</div>
      )}
      <div className="presence-list">
        {activeUsers.map((user) => {
          const initials = user.name
            .split('@')[0]
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          return (
            <div key={user.clientId} className="presence-user">
              <div 
                className="presence-avatar" 
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {initials}
              </div>
              <span className="presence-name">{user.name.split('@')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
