import { BadRequestException, Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, SessionGuard, setSessionCookie, type AuthedRequest } from './session.guard';

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(200),
  deviceName: z.string().trim().min(1).max(100),
});

function parse(body: unknown) {
  const result = credentials.safeParse(body);
  if (!result.success) throw new BadRequestException('Please check your email and use a password of at least 10 characters.');
  return result.data;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { email, password, deviceName } = parse(body);
    const { account, token } = await this.auth.register(email, password, deviceName);
    setSessionCookie(res, token);
    return account;
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { email, password, deviceName } = parse(body);
    const { account, token } = await this.auth.login(email, password, deviceName);
    setSessionCookie(res, token);
    return account;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string') await this.auth.logout(token);
    res.clearCookie(SESSION_COOKIE, { path: '/api' });
    return {};
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: AuthedRequest) {
    return req.account;
  }
}
