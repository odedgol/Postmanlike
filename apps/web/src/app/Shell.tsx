import { Sidebar } from '../features/sidebar/Sidebar';
import { TabArea } from '../features/tabs/TabArea';
import { ConsolePanel } from '../features/console/ConsolePanel';
import { TopBar } from './TopBar';

interface Props {
  onRequestSave: () => void;
  onRequestCodegen: () => void;
  onRequestImport: () => void;
}

export function Shell({ onRequestSave, onRequestCodegen, onRequestImport }: Props) {
  return (
    <div className="h-full w-full grid grid-rows-[auto_1fr_auto] overflow-hidden">
      <TopBar />
      <div className="grid grid-cols-[280px_1fr] overflow-hidden border-t border-neutral-300 dark:border-neutral-800">
        <aside
          data-testid="sidebar"
          className="border-r border-neutral-300 dark:border-neutral-800 overflow-hidden"
        >
          <Sidebar />
        </aside>
        <main className="overflow-hidden">
          <TabArea
            onRequestSave={onRequestSave}
            onRequestCodegen={onRequestCodegen}
            onRequestImport={onRequestImport}
          />
        </main>
      </div>
      <ConsolePanel />
    </div>
  );
}
