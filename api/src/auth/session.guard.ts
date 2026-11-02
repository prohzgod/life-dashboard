import { Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
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
