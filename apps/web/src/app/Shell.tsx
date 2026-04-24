import { Sidebar } from '../features/sidebar/Sidebar';
import { TabArea } from '../features/tabs/TabArea';
import { ConsolePanel } from '../features/console/ConsolePanel';
import { UpdateBanner } from '../features/install/UpdateBanner';
import { TopBar } from './TopBar';

interface Props {
  onRequestSave: () => void;
  onRequestCodegen: () => void;
  onRequestImport: () => void;
}

export function Shell({ onRequestSave, onRequestCodegen, onRequestImport }: Props) {
  // flex-col is used instead of a 4-row CSS grid because `UpdateBanner`
  // returns `null` when no update is pending. A grid with a fixed row
  // count would assign remaining children to the wrong tracks in that
  // case — previously making ConsolePanel collapse into the 1fr row and
  // squeezing the main content.
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <UpdateBanner />
      <TopBar />
      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr] overflow-hidden border-t border-neutral-300 dark:border-neutral-800">
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
