// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Setup from './ui/Setup.jsx';
import { ManagerContext } from './ui/context.jsx';
import { getManagerWorld } from './data.js';

vi.mock('./data.js', () => ({
  getAvailableYears: () => [1990, 2001, 2022, 2023, 2024, 2025, 2026],
  getManagerWorld: vi.fn(year => ({ year, competitions: [], clubs: [], players: [], countries: [] })),
}));
// The season's career evidence is a lazily loaded chunk; resolve it at once here.
vi.mock('./evidence-archive.js', () => ({ loadSeasonEvidence: vi.fn(async () => null) }));

describe('career season selection', () => {
  let container, root;
  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(React.createElement(ManagerContext.Provider, { value: { lang: 'es', t: es => es } }, React.createElement(Setup))));
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent.includes('Nueva carrera')).click());
    await act(async () => vi.advanceTimersByTimeAsync(40));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });
  it('offers every archived year and defaults to the latest, including non-featured seasons', async () => {
    const select = container.querySelector('select');
    expect([...select.options].map(option => option.text)).toEqual(['2026/27', '2025/26', '2024/25', '2023/24', '2022/23', '2001/02', '1990/91']);
    expect(select.value).toBe('2026');
    await act(async () => { select.value = '2001'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => vi.advanceTimersByTimeAsync(40));
    expect(getManagerWorld).toHaveBeenLastCalledWith(2001);
    expect(container.querySelector('.mg-era-big').textContent).toBe('2001/02');
  });
  it('moves the slider through available years only, even when the archive has gaps', async () => {
    const slider = container.querySelector('input[type="range"]');
    expect(slider.max).toBe('6');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '0');
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => vi.advanceTimersByTimeAsync(40));
    expect(container.querySelector('select').value).toBe('1990');
    expect(getManagerWorld).toHaveBeenLastCalledWith(1990);
    expect(slider.getAttribute('aria-valuetext')).toBe('1990/91');
  });
  it('rebuilds the five shortcuts from every selection, including shortcut clicks and the archive boundary', async () => {
    const labels = () => [...container.querySelectorAll('.mg-era-cards b')].map(node => node.textContent);
    expect(labels()).toEqual(['2026/27', '2025/26', '2024/25', '2023/24', '2022/23']);
    await act(async () => container.querySelectorAll('.mg-era-cards button')[1].click());
    expect(labels()).toEqual(['2025/26', '2024/25', '2023/24', '2022/23', '2001/02']);
    const select = container.querySelector('select');
    await act(async () => { select.value = '1990'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(labels()).toEqual(['1990/91']);
    expect(container.querySelector('.mg-era-cards button').getAttribute('aria-pressed')).toBe('true');
  });
});
