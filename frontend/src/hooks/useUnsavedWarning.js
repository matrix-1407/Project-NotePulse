import { useEffect } from 'react';

/**
 * Hook to warn users about unsaved changes before leaving the page
 * @param {boolean} isDirty - Whether there are unsaved changes
 * @param {string} message - Optional custom warning message
 */
export function useUnsavedWarning(isDirty, message = 'You have unsaved changes. Are you sure you want to leave?') {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);
}
