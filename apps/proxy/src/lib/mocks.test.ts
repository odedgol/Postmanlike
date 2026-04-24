import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server.js';
import { MockRegistry, mockRegistry } from './mocks.js';

describe('MockRegistry', () => {
  let reg: MockRegistry;
  beforeEach(() => {
    reg = new MockRegistry();
  });

  it('upserts and matches on method+path (case/trailing-slash insensitive)', () => {
    reg.upsert({
      id: 'a',
      name: 'A',
      routes: [
        { method: 'get', path: 'users', response: { status: 200, headers: {}, body: '[]' } },
      ],
    });
    expect(reg.match('a', 'GET', '/users')).toBeTruthy();
    expect(reg.match('a', 'GET', '/users/')).toBeTruthy();
    expect(reg.match('a', 'POST', '/users')).toBeUndefined();
  });

  it('delete removes the mock', () => {
    reg.upsert({ id: 'a', name: 'A', routes: [] });
    expect(reg.delete('a')).toBe(true);
    expect(reg.get('a')).toBeUndefined();
  });
});

describe('HTTP surface', () => {
  beforeEach(() => {
    for (const m of mockRegistry.list()) mockRegistry.delete(m.id);
  });

  it('PUT /mocks/:id upserts; /mock/:id/... returns the configured response', async () => {
    const app = createApp();
    await request(app)
      .put('/mocks/m1')
      .send({
        name: 'demo',
        routes: [
          {
            method: 'GET',
            path: '/ping',
            response: {
              status: 201,
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ pong: true }),
            },
          },
        ],
      })
      .expect(200);

    const res = await request(app).get('/mock/m1/ping').expect(201);
    expect(res.body).toEqual({ pong: true });
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('/mock/:id/* returns 404 when no route matches', async () => {
    const app = createApp();
    await request(app)
      .put('/mocks/m2')
      .send({ name: 'n', routes: [{ method: 'GET', path: '/a', response: { status: 200, headers: {}, body: 'a' } }] });
    await request(app).get('/mock/m2/missing').expect(404);
  });

  it('DELETE /mocks/:id removes the registration', async () => {
    const app = createApp();
    await request(app)
      .put('/mocks/m3')
      .send({ name: 'n', routes: [{ method: 'GET', path: '/a', response: { status: 200, headers: {}, body: '' } }] });
    await request(app).delete('/mocks/m3').expect(200);
    await request(app).get('/mock/m3/a').expect(404);
  });
});
