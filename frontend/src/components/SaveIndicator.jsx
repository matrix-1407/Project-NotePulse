import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader, AlertCircle, WifiOff } from 'lucide-react';
import '../styles/SaveIndicator.css';

export default function SaveIndicator({ saveState, lastSavedAt, error }) {
  const getIcon = () => {
    switch (saveState) {
      case 'saving':
        return <Loader size={14} className="save-icon-spin" />;
      case 'saved':
        return <Check size={14} />;
      case 'unsaved':
        return <AlertCircle size={14} />;
      case 'offline':
        return <WifiOff size={14} />;
      default:
        return <Check size={14} />;
    }
  };

  const getText = () => {
    if (error) return error;
    switch (saveState) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Saved';
      case 'unsaved':
        return 'Unsaved changes';
      case 'offline':
        return 'Offline';
      default:
        return 'Saved';
    }
  };

  const getClassName = () => {
    if (error) return 'save-indicator error';
    return `save-indicator ${saveState}`;
  };

  return (
    <motion.div
      className={getClassName()}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={saveState}
          className="save-icon"
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {getIcon()}
        </motion.div>
      </AnimatePresence>
      <span className="save-text">{getText()}</span>
    </motion.div>
  );
}
