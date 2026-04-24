import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { useSwUpdate } from './useSwUpdate';

// Minimal Workbox stub so the hook can construct one without a real SW
// environment. messageSkipWaiting is a spy; register resolves.
const wbInstance = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  register: vi.fn(async () => undefined),
  messageSkipWaiting: vi.fn(),
}));

vi.mock('workbox-window', () => ({
  Workbox: vi.fn(() => wbInstance),
}));

function Probe() {
  const s = useSwUpdate();
  return (
    <div>
      <button data-testid="reload" onClick={s.reload}>
        reload
      </button>
      <span data-testid="needs">{String(s.needsUpdate)}</span>
    </div>
  );
}

describe('useSwUpdate', () => {
  const originalReload = window.location.reload;
  const reloadSpy = vi.fn();
  const originalSw = (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom doesn't ship a serviceWorker; stub just enough that the
    // `'serviceWorker' in navigator` guard passes and the hook's effect runs.
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        reload: reloadSpy,
      } as Location,
    });
    reloadSpy.mockReset();
    wbInstance.messageSkipWaiting.mockReset();
    wbInstance.addEventListener.mockReset();
    wbInstance.removeEventListener.mockReset();
    wbInstance.register.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: originalReload } as Location,
    });
    if (originalSw === undefined) {
      delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
    } else {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: originalSw,
      });
    }
    cleanup();
  });

  it('reload() posts SKIP_WAITING then reloads after the fallback timeout', () => {
    render(<Probe />);
    act(() => {
      screen.getByTestId('reload').click();
    });
    // The Workbox skip-waiting message was dispatched.
    expect(wbInstance.messageSkipWaiting).toHaveBeenCalledTimes(1);
    // No reload yet — fallback timer hasn't elapsed.
    expect(reloadSpy).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    // Fallback fired.
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('only reloads once even if reload() is clicked repeatedly', () => {
    render(<Probe />);
    act(() => {
      screen.getByTestId('reload').click();
      screen.getByTestId('reload').click();
      screen.getByTestId('reload').click();
    });
    act(() => {
      vi.advanceTimersByTime(2400);
    });
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('firing the controlling event from the SW also reloads (once)', () => {
    render(<Probe />);
    // Grab the controlling handler the hook registered.
    const register = wbInstance.addEventListener.mock.calls.find(
      ([event]) => event === 'controlling',
    );
    expect(register).toBeTruthy();
    const handler = register![1] as () => void;
    act(() => {
      handler();
    });
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    // Subsequent events are no-ops.
    act(() => {
      handler();
    });
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
