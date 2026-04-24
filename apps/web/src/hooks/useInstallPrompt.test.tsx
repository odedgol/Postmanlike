import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useInstallPrompt } from './useInstallPrompt';

// Small probe component that re-renders from the hook so tests can observe state.
function Probe() {
  const s = useInstallPrompt();
  return (
    <div>
      <span data-testid="canInstall">{String(s.canInstall)}</span>
      <span data-testid="standalone">{String(s.isStandalone)}</span>
      <button data-testid="install" onClick={() => void s.install()}>
        install
      </button>
    </div>
  );
}

interface MockPromptEvent extends Event {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function makeEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): MockPromptEvent {
  const e = new Event('beforeinstallprompt') as MockPromptEvent;
  e.prompt = vi.fn(async () => {});
  e.userChoice = Promise.resolve({ outcome, platform: 'web' });
  return e;
}

describe('useInstallPrompt', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => {
    // Force display-mode != standalone so canInstall can flip true.
    window.matchMedia = ((q: string) =>
      ({
        matches: false,
        media: q,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as unknown as MediaQueryList)) as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('canInstall is false before beforeinstallprompt fires', () => {
    render(<Probe />);
    expect(screen.getByTestId('canInstall').textContent).toBe('false');
  });

  it('canInstall flips true when beforeinstallprompt fires', () => {
    render(<Probe />);
    act(() => {
      window.dispatchEvent(makeEvent());
    });
    expect(screen.getByTestId('canInstall').textContent).toBe('true');
  });

  it('install() calls prompt() on the stashed event and clears state', async () => {
    render(<Probe />);
    const event = makeEvent('accepted');
    act(() => {
      window.dispatchEvent(event);
    });
    await act(async () => {
      screen.getByTestId('install').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(event.prompt).toHaveBeenCalled();
    expect(screen.getByTestId('canInstall').textContent).toBe('false');
  });

  it('appinstalled flips standalone true and clears canInstall', () => {
    render(<Probe />);
    act(() => {
      window.dispatchEvent(makeEvent());
    });
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.getByTestId('canInstall').textContent).toBe('false');
    expect(screen.getByTestId('standalone').textContent).toBe('true');
  });
});
