import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { accountStore } from '../lib/auth.js';

async function freshApp() {
  // Use a per-test temp dir so workspace writes don't collide.
  const tmp = mkdtempSync(resolve(tmpdir(), 'postmanlike-ws-'));
  process.env.POSTMANLIKE_DATA_DIR = tmp;
  // The auth module captured its DATA_DIR at import time. Workspace store
  // reads it per-call, so this env var is all we need for the test.
  const { createApp } = await import('../server.js');
  return { app: createApp(), tmp };
}

function cleanup(tmp: string) {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

describe('/workspace', () => {
  let tmp = '';
  let app: Awaited<ReturnType<typeof freshApp>>['app'];

  beforeEach(async () => {
    accountStore.clear();
    const fresh = await freshApp();
    tmp = fresh.tmp;
    app = fresh.app;
  });
  afterEach(() => cleanup(tmp));

  async function registerAndGetToken(email: string, password = 'password1'): Promise<string> {
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password })
      .expect(200);
    return res.body.token as string;
  }

  it('requires auth', async () => {
    await request(app).get('/workspace').expect(401);
    await request(app).put('/workspace').send({ data: {} }).expect(401);
  });

  it('GET returns null for a user who has never saved', async () => {
    const token = await registerAndGetToken('a@b.com');
    const res = await request(app)
      .get('/workspace')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.snapshot).toBeNull();
  });

  it('PUT then GET round-trips the exact data', async () => {
    const token = await registerAndGetToken('a@b.com');
    const payload = { collections: [{ id: 'c1', name: 'Mine' }], environments: [] };
    await request(app)
      .put('/workspace')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: payload, version: 3 })
      .expect(200);

    const res = await request(app)
      .get('/workspace')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.snapshot.data).toEqual(payload);
    expect(res.body.snapshot.version).toBe(3);
    expect(typeof res.body.snapshot.updatedAt).toBe('number');
  });

  it("one user's snapshot is never visible to another", async () => {
    const alice = await registerAndGetToken('alice@b.com');
    const bob = await registerAndGetToken('bob@b.com');

    await request(app)
      .put('/workspace')
      .set('Authorization', `Bearer ${alice}`)
      .send({ data: { collections: [{ id: 'a1', name: 'Alice only' }] } })
      .expect(200);

    const bobRes = await request(app)
      .get('/workspace')
      .set('Authorization', `Bearer ${bob}`)
      .expect(200);
    expect(bobRes.body.snapshot).toBeNull();

    await request(app)
      .put('/workspace')
      .set('Authorization', `Bearer ${bob}`)
      .send({ data: { collections: [{ id: 'b1', name: 'Bob only' }] } })
      .expect(200);

    const aliceRes = await request(app)
      .get('/workspace')
      .set('Authorization', `Bearer ${alice}`)
      .expect(200);
    expect(aliceRes.body.snapshot.data.collections[0].name).toBe('Alice only');
  });

  it('rejects a PUT with missing data', async () => {
    const token = await registerAndGetToken('a@b.com');
    const res = await request(app)
      .put('/workspace')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
    expect(res.body.error).toMatch(/data/);
  });
});
