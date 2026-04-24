import { Sidebar } from '../features/sidebar/Sidebar';
import { TabArea } from '../features/tabs/TabArea';
import { TopBar } from './TopBar';

export function Shell() {
  return (
    <div className="h-full w-full grid grid-rows-[auto_1fr] overflow-hidden">
      <TopBar />
      <div className="grid grid-cols-[260px_1fr] overflow-hidden border-t border-neutral-300 dark:border-neutral-800">
        <aside
          data-testid="sidebar"
          className="border-r border-neutral-300 dark:border-neutral-800 overflow-auto"
        >
          <Sidebar />
        </aside>
        <main className="overflow-hidden">
          <TabArea />
        </main>
      </div>
    </div>
  );
}
