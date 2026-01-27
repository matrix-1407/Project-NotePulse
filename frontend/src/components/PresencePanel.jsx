import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { getDocumentPresence } from '../supabaseClient';
import '../styles/PresencePanel.css';

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
            id: state.user.id || clientId,
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
          id: p.user_id,
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
    <motion.div
      className="presence-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="presence-header">
        <Users size={16} className="presence-icon" />
        <h3>
          Active ({activeUsers.length})
          {mode === 'supabase' ? ' (fallback)' : ''}
        </h3>
      </div>
      {!provider && (
        <div className="presence-empty">Offline (not connected)</div>
      )}
      {provider && activeUsers.length === 0 && (
        <div className="presence-empty">No collaborators yet</div>
      )}
      <div className="presence-list">
        <AnimatePresence mode="popLayout">
          {activeUsers.map((user) => {
            const initials = user.name
              .split('@')[0]
              .split(' ')
              .map(n => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <motion.div
                key={user.clientId}
                className="presence-user"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <div className="presence-user-tooltip">
                  <div 
                    className="presence-avatar" 
                    style={{ backgroundColor: user.color }}
                  >
                    <div className="presence-pulse" style={{ borderColor: user.color }} />
                    {initials}
                  </div>
                  <span className="presence-tooltip">{user.name}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}