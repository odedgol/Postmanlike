import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyValueTable } from './KeyValueTable';

describe('KeyValueTable', () => {
  it('calls onChange with a trailing empty row when a row is typed into', async () => {
    const onChange = vi.fn();
    render(
      <KeyValueTable
        testid="kv"
        rows={[{ key: '', value: '', enabled: true }]}
        onChange={onChange}
      />,
    );
    await userEvent.type(screen.getByTestId('kv-key-0'), 'a');
    // Last call carries a new trailing blank row.
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.length).toBe(2);
    expect(last[0].key).toBe('a');
    expect(last[1].key).toBe('');
  });

  it('removes a row when × is clicked; always preserves at least one', async () => {
    const onChange = vi.fn();
    render(
      <KeyValueTable
        rows={[
          { key: 'a', value: '1', enabled: true },
          { key: 'b', value: '2', enabled: true },
        ]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByLabelText('Remove row 1'));
    expect(onChange).toHaveBeenLastCalledWith([{ key: 'b', value: '2', enabled: true }]);
  });
});
