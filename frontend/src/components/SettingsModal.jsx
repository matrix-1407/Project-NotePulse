import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import '../styles/SettingsModal.css';

export default function SettingsModal({ isOpen, onClose, user, profile }) {
  const [selectedTab, setSelectedTab] = useState('account');

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="settings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="settings-modal"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="settings-header">
            <h2>Settings</h2>
            <button className="settings-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="settings-content">
            <div className="settings-tabs">
              <button
                className={`settings-tab ${selectedTab === 'account' ? 'active' : ''}`}
                onClick={() => setSelectedTab('account')}
              >
                Account
              </button>
              <button
                className={`settings-tab ${selectedTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setSelectedTab('appearance')}
              >
                Appearance
              </button>
              <button
                className={`settings-tab ${selectedTab === 'editor' ? 'active' : ''}`}
                onClick={() => setSelectedTab('editor')}
              >
                Editor
              </button>
            </div>

            <div className="settings-panel">
              {selectedTab === 'account' && (
                <div className="settings-section">
                  <h3>Account Information</h3>
                  <div className="settings-item">
                    <label>Name</label>
                    <input
                      type="text"
                      value={profile?.full_name || ''}
                      readOnly
                      className="settings-input"
                    />
                  </div>
                  <div className="settings-item">
                    <label>Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="settings-input"
                    />
                  </div>
                  <p className="settings-note">Account settings are read-only</p>
                </div>
              )}

              {selectedTab === 'appearance' && (
                <div className="settings-section">
                  <h3>Appearance</h3>
                  <div className="settings-item">
                    <label>Theme</label>
                    <p className="settings-description">
                      Use the theme toggle in the header to switch between light and dark mode
                    </p>
                  </div>
                  <div className="settings-item">
                    <label>Font Size</label>
                    <p className="settings-description">Coming soon</p>
                  </div>
                </div>
              )}

              {selectedTab === 'editor' && (
                <div className="settings-section">
                  <h3>Editor Preferences</h3>
                  <div className="settings-item">
                    <label>Auto-save</label>
                    <p className="settings-description">Documents auto-save every few seconds</p>
                  </div>
                  <div className="settings-item">
                    <label>Shortcuts</label>
                    <p className="settings-description">
                      <strong>Ctrl+K</strong> - Command Palette<br />
                      <strong>F</strong> - Focus Mode<br />
                      <strong>?</strong> - Help
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
