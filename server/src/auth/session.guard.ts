import { ConflictException, Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SYNC_ACCOUNT_HEADER } from '@life-dashboard/shared';
import type { Request, Response } from 'express';
import { AuthService, SESSION_DAYS } from './auth.service';

export const SESSION_COOKIE = 'ld_session';

export type AuthedRequest = Request & { account: { id: string; email: string } };

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'test',
    sameSite: 'strict',
    path: '/api',
    maxAge: SESSION_DAYS * 86_400_000,
  });
}

/** Every data route goes through this. The account always comes from the session, never the request. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthedRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE];
    const found = typeof token === 'string' ? await this.auth.resolve(token) : null;
    if (!found) throw new UnauthorizedException();
    request.account = { id: found.id, email: found.email };
    if (found.renew) setSessionCookie(http.getResponse<Response>(), token as string);
    return true;
  }
}

/**
 * The device says which account it means. If the session has since become someone else's (a sign-in
 * waiting to be confirmed), this stops one account's rows landing in another's.
 */
@Injectable()
export class SyncAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (request.headers[SYNC_ACCOUNT_HEADER] !== request.account.id) throw new ConflictException('This device is syncing with a different account.');
    return true;
  }
}

/** Limits each account's sync requests, wherever they come from. Runs after SessionGuard. */
@Injectable()
export class AccountThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(request: Record<string, unknown>): Promise<string> {
    return (request as unknown as AuthedRequest).account.id;
  }
}

/** Limits guesses at one account, however many addresses they come from. */
@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(request: Record<string, unknown>): Promise<string> {
    const { email } = (request as unknown as Request).body as { email?: unknown };
    return `email:${String(email).trim().toLowerCase()}`;
  }
}
