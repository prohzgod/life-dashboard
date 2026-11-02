import { BadRequestException, Body, Controller, Get, Inject, PayloadTooLargeException, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MAX_ROW_BYTES, SYNC_TABLES, type SyncRow } from '@life-dashboard/shared';
import { z } from 'zod';
import { SessionGuard, type AuthedRequest } from '../auth/session.guard';
import { SyncService } from './sync.service';

const pushBody = z.object({
  rows: z.array(
    z.object({
      table: z.enum(SYNC_TABLES),
      id: z.string().min(1).max(64),
      updatedAt: z.string().datetime(),
      deletedAt: z.string().datetime().nullable(),
      payload: z.record(z.string(), z.unknown()),
    }),
  ),
});

@Controller('sync')
@UseGuards(SessionGuard)
export class SyncController {
  constructor(@Inject(SyncService) private readonly sync: SyncService) {}

  @Post('push')
  push(@Req() req: AuthedRequest, @Body() body: unknown) {
    const parsed = pushBody.safeParse(body);
    if (!parsed.success) throw new BadRequestException('That sync request isn’t valid.');
    const rows = parsed.data.rows as SyncRow[];
    if (rows.some((row) => Buffer.byteLength(JSON.stringify(row)) > MAX_ROW_BYTES)) throw new PayloadTooLargeException();
    return this.sync.push(req.account.id, rows);
  }

  @Get('pull')
  pull(@Req() req: AuthedRequest, @Query('cursor') cursor?: string) {
    const from = Number(cursor ?? 0);
    if (!Number.isSafeInteger(from) || from < 0) throw new BadRequestException('That cursor isn’t valid.');
    return this.sync.pull(req.account.id, from);
  }
}
