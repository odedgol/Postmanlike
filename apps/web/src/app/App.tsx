import { useState } from 'react';
import { Shell } from './Shell';
import { SaveDialog } from '../features/collections/SaveDialog';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { useTabsPersistence } from '../state/persistence';
import { useTabsStore } from '../state/tabsStore';

export function App() {
  useTabsPersistence();
  const [saveDialogForTab, setSaveDialogForTab] = useState<string | null>(null);

  const openSaveDialog = () => {
    const { activeId, tabs } = useTabsStore.getState();
    if (tabs.some((t) => t.id === activeId)) {
      setSaveDialogForTab(activeId);
    }
  };

  const newTab = () => {
    useTabsStore.getState().addTab();
  };

  const closeActiveTab = () => {
    const { activeId } = useTabsStore.getState();
    useTabsStore.getState().closeTab(activeId);
  };

  return (
    <>
      <Shell onRequestSave={openSaveDialog} />
      <KeyboardShortcuts
        onSave={openSaveDialog}
        onNewTab={newTab}
        onCloseTab={closeActiveTab}
      />
      {saveDialogForTab && (
        <SaveDialog tabId={saveDialogForTab} onClose={() => setSaveDialogForTab(null)} />
      )}
    </>
  );
}
