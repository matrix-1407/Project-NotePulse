import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Clock, Moon, Sun, Save, Command } from 'lucide-react';
import useTheme from '../hooks/useTheme';
import '../styles/CommandPalette.css';

export default function CommandPalette({ isOpen, onClose, onCommand }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  const commands = [
    {
      id: 'save',
      label: 'Save Document',
      icon: <Save size={16} />,
      shortcut: 'Ctrl+S',
      action: () => onCommand('save'),
    },
    {
      id: 'new-doc',
      label: 'New Document',
      icon: <FileText size={16} />,
      action: () => onCommand('new-doc'),
    },
    {
      id: 'history',
      label: 'Open History',
      icon: <Clock size={16} />,
      action: () => onCommand('history'),
    },
    {
      id: 'theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`,
      icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
      action: () => {
        toggleTheme();
        onClose();
      },
    },
    {
      id: 'focus',
      label: 'Toggle Focus Mode',
      icon: <Command size={16} />,
      shortcut: 'F',
      action: () => onCommand('focus'),
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // TODO: Add keyboard navigation through commands
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        filteredCommands[0].action();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredCommands]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="command-palette-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="command-palette"
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="command-search">
            <Search size={18} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="command-input"
            />
          </div>

          <div className="command-list">
            {filteredCommands.length === 0 ? (
              <div className="command-empty">No commands found</div>
            ) : (
              filteredCommands.map((cmd) => (
                <motion.button
                  key={cmd.id}
                  className="command-item"
                  onClick={() => {
                    cmd.action();
                    if (cmd.id !== 'theme') onClose();
                  }}
                  whileHover={{ backgroundColor: 'var(--card-hover)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="command-icon">{cmd.icon}</div>
                  <span className="command-label">{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="command-shortcut">{cmd.shortcut}</span>
                  )}
                </motion.button>
              ))
            )}
          </div>

          <div className="command-footer">
            <span className="command-hint">
              <kbd>↵</kbd> to select • <kbd>Esc</kbd> to close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
