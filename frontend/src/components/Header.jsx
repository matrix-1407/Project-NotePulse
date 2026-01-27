import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, HelpCircle } from 'lucide-react';
import AnimatedLogo from './AnimatedLogo';
import ThemeToggle from './ThemeToggle';
import ConnectionStatus from './ConnectionStatus';
import '../styles/Header.css';

export default function Header({ user, profile, onSignOut, provider }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  // Keyboard shortcut for help (?)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const activeElement = document.activeElement;
        // Only trigger if not in an input
        if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA' && !activeElement.isContentEditable) {
          e.preventDefault();
          alert('Keyboard Shortcuts:\n\n' +
            'Ctrl/Cmd + S - Save document\n' +
            'Ctrl/Cmd + K - Command palette\n' +
            'Ctrl/Cmd + Enter - Send message\n' +
            'F - Focus mode\n' +
            '? - Show this help');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <motion.header
      className="app-header"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="header-left">
        <AnimatedLogo size={32} />
        <h1 className="header-title">NotePulse</h1>
      </div>

      <div className="header-right">
        {user && provider && <ConnectionStatus provider={provider} />}
        
        <ThemeToggle />

        <button
          className="help-button"
          onClick={() => alert('Keyboard Shortcuts:\n\nCtrl/Cmd + S - Save\nCtrl/Cmd + K - Commands\nF - Focus mode\n? - Show help')}
          aria-label="Show keyboard shortcuts"
          title="Show keyboard shortcuts (?)"
        >
          <HelpCircle size={18} />
        </button>

        {user && (
          <div className="user-menu-wrapper" ref={menuRef}>
            <motion.button
              className="user-avatar-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              <div className="user-avatar">
                {(profile?.full_name || user.email || 'U').substring(0, 2).toUpperCase()}
              </div>
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  className="user-menu-dropdown"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="user-menu-header">
                    <div className="user-menu-name">{profile?.full_name || 'User'}</div>
                    <div className="user-menu-email">{user.email}</div>
                  </div>
                  <div className="user-menu-divider" />
                  <button className="user-menu-item" onClick={() => alert('Settings coming soon!')}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <div className="user-menu-divider" />
                  <button className="user-menu-item sign-out" onClick={onSignOut}>
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.header>
  );
}

