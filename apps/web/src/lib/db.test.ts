import { describe, it, expect, beforeEach } from 'vitest';
import { db, recordHistory, listHistory, clearHistory } from './db';
import { newRequestDraft } from './factories';

describe('history db', () => {
  beforeEach(async () => {
    await db.history.clear();
  });

  it('records and lists history newest-first', async () => {
    await recordHistory({
      id: 'a',
      timestamp: 1,
      requestSnapshot: newRequestDraft(),
      status: 200,
      timingMs: 10,
      sizeBytes: 5,
    });
    await recordHistory({
      id: 'b',
      timestamp: 2,
      requestSnapshot: newRequestDraft(),
      status: 404,
      timingMs: 20,
      sizeBytes: 10,
    });
    const rows = await listHistory();
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('trims history beyond the cap', async () => {
    for (let i = 0; i < 210; i++) {
      await recordHistory({
        id: `h${i}`,
        timestamp: i,
        requestSnapshot: newRequestDraft(),
        status: 200,
        timingMs: 1,
        sizeBytes: 1,
      });
    }
    const rows = await listHistory();
    expect(rows.length).toBe(200);
    expect(rows[rows.length - 1].timestamp).toBe(10);
  });

  it('clearHistory wipes the table', async () => {
    await recordHistory({
      id: 'x',
      timestamp: 1,
      requestSnapshot: newRequestDraft(),
      status: 200,
      timingMs: 1,
      sizeBytes: 1,
    });
    await clearHistory();
    expect((await listHistory()).length).toBe(0);
  });
});
