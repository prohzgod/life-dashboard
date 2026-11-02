import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createTestApp, type TestApp } from './harness';

const password = 'correct horse battery';
const deviceName = 'Laptop';
let t: TestApp;
const http = () => request(t.app.getHttpServer());

beforeEach(async () => { t = await createTestApp(); });
afterEach(() => t.close());

it('anyone can register, once per email', async () => {
  expect((await http().post('/api/auth/register').send({ email: 'a@example.com', password, deviceName })).status).toBe(201);
  expect((await http().post('/api/auth/register').send({ email: 'b@example.com', password, deviceName })).status).toBe(201);
  expect((await http().post('/api/auth/register').send({ email: 'A@Example.com', password, deviceName })).status).toBe(409);
});

it('refuses a short password or a bad email', async () => {
  expect((await http().post('/api/auth/register').send({ email: 'a@example.com', password: 'short', deviceName })).status).toBe(400);
  expect((await http().post('/api/auth/register').send({ email: 'nope', password, deviceName })).status).toBe(400);
});

it('signs in and tells you who you are', async () => {
  await http().post('/api/auth/register').send({ email: 'a@example.com', password, deviceName });
  const agent = request.agent(t.app.getHttpServer());
  expect((await agent.post('/api/auth/login').send({ email: 'a@example.com', password, deviceName })).status).toBe(200);
  const me = await agent.get('/api/auth/me');
  expect(me.status).toBe(200);
  expect(me.body.email).toBe('a@example.com');
  expect(me.body.id).toEqual(expect.any(String));
});

it('a new account sees only its own session', async () => {
  const a = request.agent(t.app.getHttpServer());
  const b = request.agent(t.app.getHttpServer());
  await a.post('/api/auth/register').send({ email: 'a@example.com', password, deviceName });
  await b.post('/api/auth/register').send({ email: 'b@example.com', password, deviceName });
  expect((await a.get('/api/auth/me')).body.email).toBe('a@example.com');
  expect((await b.get('/api/auth/me')).body.email).toBe('b@example.com');
});

it('rejects a wrong password with the same reply as an unknown email', async () => {
  await http().post('/api/auth/register').send({ email: 'a@example.com', password, deviceName });
  const wrong = await http().post('/api/auth/login').send({ email: 'a@example.com', password: 'wrong password here', deviceName });
  const unknown = await http().post('/api/auth/login').send({ email: 'x@example.com', password, deviceName });
  expect(wrong.status).toBe(401);
  expect(unknown.status).toBe(401);
  expect(wrong.body).toEqual(unknown.body);
});

it('stores the password and token hashed', async () => {
  const res = await http().post('/api/auth/register').send({ email: 'a@example.com', password, deviceName });
  const cookie = String(res.headers['set-cookie']);
  const token = /ld_session=([^;]+)/.exec(cookie)![1]!;
  const user = await t.db.execute(sql`select password_hash from users`);
  const session = await t.db.execute(sql`select token_hash from sessions`);
  expect(String(user.rows[0]!.password_hash)).toMatch(/^\$argon2id\$/);
  expect(session.rows[0]!.token_hash).not.toBe(token);
});

it('sets the cookie httpOnly, same-site and under /api', async () => {
  const res = await http().post('/api/auth/register').send({ email: 'a@example.com', password, deviceName });
  const cookie = String(res.headers['set-cookie']);
  expect(cookie).toMatch(/HttpOnly/);
  expect(cookie).toMatch(/SameSite=Strict/);
  expect(cookie).toMatch(/Path=\/api/);
});

it('logout ends the session', async () => {
  const agent = request.agent(t.app.getHttpServer());
  await agent.post('/api/auth/register').send({ email: 'a@example.com', password, deviceName });
  expect((await agent.post('/api/auth/logout')).status).toBe(200);
  expect((await agent.get('/api/auth/me')).status).toBe(401);
});

it('refuses a session that has not been used for 90 days', async () => {
  const agent = request.agent(t.app.getHttpServer());
  await agent.post('/api/auth/register').send({ email: 'a@example.com', password, deviceName });
  await t.db.execute(sql`update sessions set last_seen_at = now() - interval '91 days'`);
  expect((await agent.get('/api/auth/me')).status).toBe(401);
});

it('limits login attempts', async () => {
  const send = () => http().post('/api/auth/login').send({ email: 'a@example.com', password: 'wrong password here', deviceName });
  for (let i = 0; i < 10; i++) expect((await send()).status).toBe(401);
  expect((await send()).status).toBe(429);
});

it('limits each person, not everyone behind the proxies', async () => {
  let attempt = 0;
  const send = (client: string) => http().post('/api/auth/login').set('X-Forwarded-For', `${client}, 10.0.0.9`).send({ email: `a${attempt++}@example.com`, password: 'wrong password here', deviceName });
  for (let i = 0; i < 10; i++) expect((await send('203.0.113.1')).status).toBe(401);
  expect((await send('203.0.113.1')).status).toBe(429);
  expect((await send('203.0.113.2')).status).toBe(401);
});

it('limits guesses at one account, however many addresses they come from', async () => {
  const send = (i: number) => http().post('/api/auth/login').set('X-Forwarded-For', `203.0.113.${i}, 10.0.0.9`).send({ email: 'victim@example.com', password: 'wrong password here', deviceName });
  for (let i = 0; i < 10; i++) expect((await send(i)).status).toBe(401);
  expect((await send(99)).status).toBe(429);
});

it('caps how many accounts can be made in an hour, whatever address they claim', async () => {
  await t.db.execute(sql`insert into users (id, email, password_hash) select 'u' || n, 'u' || n || '@example.com', 'x' from generate_series(1, 100) n`);
  const res = await http().post('/api/auth/register').set('X-Forwarded-For', '203.0.113.50, 10.0.0.9').send({ email: 'new@example.com', password, deviceName });
  expect(res.status).toBe(429);
});

