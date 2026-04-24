import { useEffect } from 'react';

interface Props {
  onSave: () => void;
  onNewTab: () => void;
  onCloseTab: () => void;
}

export function KeyboardShortcuts({ onSave, onNewTab, onCloseTab }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave();
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewTab();
      } else if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        onCloseTab();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave, onNewTab, onCloseTab]);

  return null;
}
