import { BadRequestException, Body, Controller, Inject, PayloadTooLargeException, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { eq, sql } from 'drizzle-orm';
import { MAX_FILE_BYTES, type PresignResponse } from '@life-dashboard/shared';
import { z } from 'zod';
import { AccountThrottlerGuard, SessionGuard, SyncAccountGuard, type AuthedRequest } from '../auth/session.guard';
import { FILES, QUOTA_BYTES } from '../config';
import { DB, type Db } from '../db/db';
import { fileReservations } from '../db/schema';
import type { FileStore } from './file-store';

const presignBody = z.object({
  items: z
    .array(
      z.object({
        attachmentId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
        kind: z.enum(['original', 'thumb']),
        mime: z.string().max(200),
        size: z.number().int().min(0),
        mode: z.enum(['put', 'get']),
      }),
    )
    .max(50),
});

@Controller('files')
@UseGuards(SessionGuard, SyncAccountGuard, AccountThrottlerGuard)
@Throttle({ default: { limit: 300, ttl: 60_000 } })
export class FilesController {
  constructor(
    @Inject(FILES) private readonly files: FileStore,
    @Inject(DB) private readonly db: Db,
    @Inject(QUOTA_BYTES) private readonly quotaBytes: number,
  ) {}

  @Post('presign')
  async presign(@Req() req: AuthedRequest, @Body() body: unknown): Promise<PresignResponse> {
    const parsed = presignBody.safeParse(body);
    if (!parsed.success) throw new BadRequestException('That file request isn’t valid.');
    const { items } = parsed.data;
    const userId = req.account.id;

    const puts = items.filter((i) => i.mode === 'put');
    if (puts.some((i) => i.size > MAX_FILE_BYTES)) throw new PayloadTooLargeException('That file is too large.');
    const keyOf = (attachmentId: string, kind: string) => `users/${userId}/attachments/${attachmentId}/${kind}`;
    if (puts.length) {
      // Count what links were given out for, not what rows claim: a client decides what its rows say.
      await this.db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
        const existing = await tx.select().from(fileReservations).where(eq(fileReservations.userId, userId));
        const sizes = new Map(existing.map((r) => [r.key, r.size]));
        for (const put of puts) sizes.set(keyOf(put.attachmentId, put.kind), put.size);
        const total = [...sizes.values()].reduce((sum, size) => sum + size, 0);
        if (total > this.quotaBytes) throw new PayloadTooLargeException('This account’s file storage is full.');
        for (const put of puts) {
          const key = keyOf(put.attachmentId, put.kind);
          await tx
            .insert(fileReservations)
            .values({ userId, key, size: put.size })
            .onConflictDoUpdate({ target: [fileReservations.userId, fileReservations.key], set: { size: put.size } });
        }
      });
    }

    return {
      items: await Promise.all(
        items.map(async ({ attachmentId, kind, mime, size, mode }) => {
          // The folder comes from the session, so a link can never reach another account's files.
          const key = keyOf(attachmentId, kind);
          return { attachmentId, kind, url: mode === 'put' ? await this.files.presignPut(key, mime, size) : await this.files.presignGet(key) };
        }),
      ),
    };
  }
}
