import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server.js';
import {
  AccountStore,
  accountStore,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
} from './auth.js';

describe('password hashing', () => {
  it('hashPassword + verifyPassword round-trips', () => {
    const stored = hashPassword('s3cret');
    expect(verifyPassword('s3cret', stored)).toBe(true);
    expect(verifyPassword('wrong', stored)).toBe(false);
  });
});

describe('token signing', () => {
  it('verifies a token it just signed', () => {
    const token = signToken({ sub: 'abc', email: 'a@b.com' });
    const payload = verifyToken(token);
    expect(payload?.sub).toBe('abc');
    expect(payload?.email).toBe('a@b.com');
  });

  it('rejects a tampered token', () => {
    const token = signToken({ sub: 'abc', email: 'a@b.com' });
    const [body, sig] = token.split('.');
    const garbled = `${body}.${'a' + sig.slice(1)}`;
    expect(verifyToken(garbled)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signToken({ sub: 'abc', email: 'a@b.com' }, -1);
    expect(verifyToken(token)).toBeNull();
  });
});

describe('AccountStore', () => {
  let store: AccountStore;
  beforeEach(() => {
    store = new AccountStore();
  });

  it('register creates an account; duplicates throw', () => {
    store.register('a@b.com', 'hunter22');
    expect(() => store.register('a@b.com', 'anything')).toThrow(/already/);
  });

  it('login returns the account only for correct credentials', () => {
    store.register('a@b.com', 'hunter22');
    expect(store.login('a@b.com', 'hunter22')?.email).toBe('a@b.com');
    expect(store.login('a@b.com', 'nope')).toBeNull();
    expect(store.login('other@b.com', 'hunter22')).toBeNull();
  });
});

describe('/auth HTTP surface', () => {
  beforeEach(() => accountStore.clear());

  it('register returns token + account', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'password' })
      .expect(200);
    expect(res.body.token).toMatch(/\./);
    expect(res.body.account.email).toBe('user@example.com');
  });

  it('register rejects short passwords and invalid emails', async () => {
    const app = createApp();
    await request(app).post('/auth/register').send({ email: 'bad', password: 'password' }).expect(400);
    await request(app)
      .post('/auth/register')
      .send({ email: 'ok@b.com', password: 'x' })
      .expect(400);
  });

  it('login rejects bad credentials', async () => {
    const app = createApp();
    await request(app).post('/auth/register').send({ email: 'u@x.com', password: 'password' });
    await request(app)
      .post('/auth/login')
      .send({ email: 'u@x.com', password: 'wrong' })
      .expect(401);
  });

  it('/auth/me returns the account for a valid token', async () => {
    const app = createApp();
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'u@x.com', password: 'password' });
    const me = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .expect(200);
    expect(me.body.account.email).toBe('u@x.com');
  });
});
