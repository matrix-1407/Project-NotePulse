import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import useTheme from '../hooks/useTheme';
import '../styles/ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      className="theme-toggle"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <motion.div
        className="theme-toggle-icon"
        initial={false}
        animate={{
          rotate: theme === 'dark' ? 0 : 180,
          scale: theme === 'dark' ? 1 : 0.8,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {theme === 'dark' ? (
          <Moon size={18} strokeWidth={2} />
        ) : (
          <Sun size={18} strokeWidth={2} />
        )}
      </motion.div>
    </motion.button>
  );
}
