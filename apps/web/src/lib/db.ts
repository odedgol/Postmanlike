import Dexie, { type Table } from 'dexie';
import type { HistoryEntry } from '@postmanlike/shared';

export class PostmanlikeDB extends Dexie {
  history!: Table<HistoryEntry, string>;

  constructor() {
    super('postmanlike');
    this.version(1).stores({
      history: 'id, timestamp',
    });
  }
}

export const db = new PostmanlikeDB();

const HISTORY_CAP = 200;

export async function recordHistory(entry: HistoryEntry) {
  await db.history.put(entry);
  const count = await db.history.count();
  if (count > HISTORY_CAP) {
    const excess = count - HISTORY_CAP;
    const oldest = await db.history.orderBy('timestamp').limit(excess).toArray();
    await db.history.bulkDelete(oldest.map((e) => e.id));
  }
}

export async function listHistory(): Promise<HistoryEntry[]> {
  return db.history.orderBy('timestamp').reverse().toArray();
}

export async function clearHistory() {
  await db.history.clear();
}
