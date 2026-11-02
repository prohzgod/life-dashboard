import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { DB, type Db } from '../db/db';
import { sessions, users } from '../db/schema';

export const SESSION_DAYS = 90;
const DAY_MS = 86_400_000;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
// Checked when an email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = hash('not a real password');

export type Account = { id: string; email: string };

@Injectable()
export class AuthService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async register(email: string, password: string, deviceName: string): Promise<{ account: Account; token: string }> {
    const id = randomUUID();
    const passwordHash = await hash(password);
    const [row] = await this.db.insert(users).values({ id, email, passwordHash }).onConflictDoNothing().returning({ id: users.id });
    if (!row) throw new ConflictException('That email already has an account.');
    return { account: { id, email }, token: await this.newSession(id, deviceName) };
  }

  async login(email: string, password: string, deviceName: string): Promise<{ account: Account; token: string }> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    const ok = await verify(user?.passwordHash ?? (await DUMMY_HASH), password);
    if (!user || !ok) throw new UnauthorizedException('That email and password don’t match.');
    return { account: { id: user.id, email: user.email }, token: await this.newSession(user.id, deviceName) };
  }

  async logout(token: string) {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }

  /** Who a token belongs to. `renew` is true at most once a day, when the cookie should be re-sent. */
  async resolve(token: string): Promise<(Account & { renew: boolean }) | null> {
    const tokenHash = hashToken(token);
    const [row] = await this.db
      .select({ id: users.id, email: users.email, lastSeenAt: sessions.lastSeenAt })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.tokenHash, tokenHash));
    if (!row) return null;
    const age = Date.now() - new Date(row.lastSeenAt).getTime();
    if (age > SESSION_DAYS * DAY_MS) {
      await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
      return null;
    }
    const renew = age > DAY_MS;
    if (renew) await this.db.update(sessions).set({ lastSeenAt: sql`now()` }).where(eq(sessions.tokenHash, tokenHash));
    return { id: row.id, email: row.email, renew };
  }

  private async newSession(userId: string, deviceName: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.db.insert(sessions).values({ tokenHash: hashToken(token), userId, deviceName });
    return token;
  }
}
