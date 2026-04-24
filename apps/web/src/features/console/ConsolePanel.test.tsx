import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CONSOLE_DEFAULT_HEIGHT,
  CONSOLE_HEIGHT_STORAGE_KEY,
  CONSOLE_MIN_HEIGHT,
  ConsolePanel,
  clampHeight,
  heightFromDrag,
  loadConsoleHeight,
} from './ConsolePanel';
import { useConsoleStore } from '../../state/consoleStore';

function heightOf(el: HTMLElement): number {
  return Number.parseFloat(el.style.height);
}

describe('heightFromDrag', () => {
  it('dragging up (smaller clientY) grows the console', () => {
    expect(
      heightFromDrag({ startY: 500, currentY: 400, startHeight: 180, viewportHeight: 1000 }),
    ).toBe(280);
  });

  it('dragging down (larger clientY) shrinks the console', () => {
    expect(
      heightFromDrag({ startY: 500, currentY: 550, startHeight: 180, viewportHeight: 1000 }),
    ).toBe(130);
  });

  it('clamps at the minimum height when dragged way below', () => {
    expect(
      heightFromDrag({ startY: 100, currentY: 10_000, startHeight: 180, viewportHeight: 1000 }),
    ).toBe(CONSOLE_MIN_HEIGHT);
  });

  it('clamps to leave at least 160px above the console in the viewport', () => {
    const res = heightFromDrag({
      startY: 500,
      currentY: 0,
      startHeight: 180,
      viewportHeight: 800,
    });
    // viewport 800, margin 160 → cap at 640
    expect(res).toBe(640);
  });
});

describe('clampHeight', () => {
  it('never returns less than MIN_HEIGHT', () => {
    expect(clampHeight(0, 1000)).toBe(CONSOLE_MIN_HEIGHT);
    expect(clampHeight(-999, 1000)).toBe(CONSOLE_MIN_HEIGHT);
  });

  it('never exceeds viewportHeight - margin', () => {
    expect(clampHeight(10_000, 600)).toBe(440); // 600 - 160
  });
});

describe('loadConsoleHeight', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns the default when nothing is stored', () => {
    expect(loadConsoleHeight()).toBe(CONSOLE_DEFAULT_HEIGHT);
  });

  it('returns the default on garbage / zero', () => {
    window.localStorage.setItem(CONSOLE_HEIGHT_STORAGE_KEY, 'abc');
    expect(loadConsoleHeight()).toBe(CONSOLE_DEFAULT_HEIGHT);
    window.localStorage.setItem(CONSOLE_HEIGHT_STORAGE_KEY, '0');
    expect(loadConsoleHeight()).toBe(CONSOLE_DEFAULT_HEIGHT);
  });

  it('returns a previously-saved height, clamped at MIN', () => {
    window.localStorage.setItem(CONSOLE_HEIGHT_STORAGE_KEY, '250');
    expect(loadConsoleHeight()).toBe(250);
    window.localStorage.setItem(CONSOLE_HEIGHT_STORAGE_KEY, '20');
    expect(loadConsoleHeight()).toBe(CONSOLE_MIN_HEIGHT);
  });
});

describe('ConsolePanel', () => {
  beforeEach(() => {
    useConsoleStore.getState().clear();
    window.localStorage.clear();
    cleanup();
  });

  it('renders collapsed by default; toggle opens the body and the resize handle', async () => {
    render(<ConsolePanel />);
    expect(screen.queryByTestId('console-body')).toBeNull();
    expect(screen.queryByTestId('console-resize-handle')).toBeNull();
    await userEvent.click(screen.getByTestId('console-toggle'));
    expect(screen.getByTestId('console-body')).toBeInTheDocument();
    expect(screen.getByTestId('console-resize-handle')).toBeInTheDocument();
  });

  it('renders the body at the default height on first open', async () => {
    render(<ConsolePanel />);
    await userEvent.click(screen.getByTestId('console-toggle'));
    expect(heightOf(screen.getByTestId('console-body'))).toBe(CONSOLE_DEFAULT_HEIGHT);
  });

  it('rehydrates from localStorage on mount', async () => {
    window.localStorage.setItem(CONSOLE_HEIGHT_STORAGE_KEY, '300');
    render(<ConsolePanel />);
    await userEvent.click(screen.getByTestId('console-toggle'));
    expect(heightOf(screen.getByTestId('console-body'))).toBe(300);
  });

  it('starts a drag on pointerdown and flips the handle to the brand color', async () => {
    render(<ConsolePanel />);
    await userEvent.click(screen.getByTestId('console-toggle'));
    const handle = screen.getByTestId('console-resize-handle');
    expect(handle.className).not.toMatch(/bg-brand(\s|$)/);
    fireEvent.pointerDown(handle, { clientY: 500 });
    expect(handle.className).toMatch(/bg-brand/);
  });
});
