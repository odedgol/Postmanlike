import { useState } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export function InstallButton() {
  const { canInstall, isIosSafari, install } = useInstallPrompt();
  const [iosHintOpen, setIosHintOpen] = useState(false);

  if (canInstall) {
    return (
      <button
        data-testid="install-button"
        className="pl-btn pl-btn-ghost"
        onClick={() => install()}
        title="Install Postmanlike as a desktop app"
      >
        Install
      </button>
    );
  }

  if (isIosSafari) {
    return (
      <>
        <button
          data-testid="install-ios-hint-button"
          className="pl-btn pl-btn-ghost"
          onClick={() => setIosHintOpen(true)}
        >
          Install
        </button>
        {iosHintOpen && (
          <div
            role="dialog"
            aria-modal="true"
            data-testid="install-ios-hint"
            className="fixed inset-0 z-50 grid place-items-center bg-black/60"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIosHintOpen(false);
            }}
          >
            <div className="w-[360px] bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-5 text-sm space-y-2">
              <div className="font-semibold">Install on iOS</div>
              <ol className="list-decimal pl-5 text-neutral-500 space-y-1">
                <li>Tap the Share icon in Safari.</li>
                <li>Choose <span className="font-mono">Add to Home Screen</span>.</li>
                <li>Tap Add.</li>
              </ol>
              <div className="flex justify-end">
                <button className="pl-btn pl-btn-ghost" onClick={() => setIosHintOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
