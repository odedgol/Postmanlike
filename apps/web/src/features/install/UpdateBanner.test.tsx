import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateBanner } from './UpdateBanner';

const mockState = vi.hoisted(() => ({
  needsUpdate: false,
  reload: vi.fn(),
  registered: true,
}));

vi.mock('../../hooks/useSwUpdate', () => ({
  useSwUpdate: () => mockState,
}));

describe('UpdateBanner', () => {
  it('renders nothing when no update is waiting', () => {
    mockState.needsUpdate = false;
    mockState.reload = vi.fn();
    render(<UpdateBanner />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
    cleanup();
  });

  it('renders the banner when needsUpdate is true', () => {
    mockState.needsUpdate = true;
    mockState.reload = vi.fn();
    render(<UpdateBanner />);
    expect(screen.getByTestId('update-banner')).toBeInTheDocument();
    expect(screen.getByTestId('update-banner-reload')).toHaveTextContent('Reload to update');
    cleanup();
  });

  it('clicking Reload to update invokes the hook-provided reload()', async () => {
    mockState.needsUpdate = true;
    const reloadSpy = vi.fn();
    mockState.reload = reloadSpy;
    render(<UpdateBanner />);
    await userEvent.click(screen.getByTestId('update-banner-reload'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
