import { useState } from 'react';
import { Shell } from './Shell';
import { SaveDialog } from '../features/collections/SaveDialog';
import { ImportDialog } from '../features/import/ImportDialog';
import { CodeGenPanel } from '../features/codegen/CodeGenPanel';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { useTabsPersistence } from '../state/persistence';
import { useTabsStore } from '../state/tabsStore';
import { useWorkspaceSync } from '../state/syncEngine';

export function App() {
  useTabsPersistence();
  useWorkspaceSync();
  const [saveDialogForTab, setSaveDialogForTab] = useState<string | null>(null);
  const [codegenForTab, setCodegenForTab] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const openSaveDialog = () => {
    const { activeId, tabs } = useTabsStore.getState();
    if (tabs.some((t) => t.id === activeId)) setSaveDialogForTab(activeId);
  };

  const openCodegen = () => {
    const { activeId, tabs } = useTabsStore.getState();
    if (tabs.some((t) => t.id === activeId)) setCodegenForTab(activeId);
  };

  const newTab = () => useTabsStore.getState().addTab();
  const closeActiveTab = () => {
    const { activeId } = useTabsStore.getState();
    useTabsStore.getState().closeTab(activeId);
  };

  return (
    <>
      <Shell
        onRequestSave={openSaveDialog}
        onRequestCodegen={openCodegen}
        onRequestImport={() => setImportOpen(true)}
      />
      <KeyboardShortcuts
        onSave={openSaveDialog}
        onNewTab={newTab}
        onCloseTab={closeActiveTab}
      />
      {saveDialogForTab && (
        <SaveDialog tabId={saveDialogForTab} onClose={() => setSaveDialogForTab(null)} />
      )}
      {codegenForTab && (
        <CodeGenPanel tabId={codegenForTab} onClose={() => setCodegenForTab(null)} />
      )}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
    </>
  );
}
