import { useState, useEffect } from 'react';
import { EnvSelector } from '../features/env/EnvSelector';
import { RunnerDialog } from '../features/runner/RunnerDialog';

export function TopBar() {
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true,
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="h-11 flex items-center gap-3 px-3 bg-neutral-200/60 dark:bg-neutral-900">
      <div className="flex items-center gap-2 font-semibold">
        <span className="inline-block h-4 w-4 rounded-sm bg-brand" aria-hidden />
        Postmanlike
      </div>
      <div className="text-xs text-neutral-500">desktop web</div>
      <div className="flex-1" />
      <button
        className="pl-btn pl-btn-ghost"
        onClick={() => setRunnerOpen(true)}
        data-testid="runner-button"
      >
        Runner
      </button>
      <EnvSelector />
      <button
        className="pl-btn pl-btn-ghost"
        onClick={() => setDark((v) => !v)}
        aria-label="Toggle theme"
      >
        {dark ? 'Light' : 'Dark'}
      </button>
      {runnerOpen && <RunnerDialog onClose={() => setRunnerOpen(false)} />}
    </div>
  );
}
