import { BadRequestException, Body, Controller, Inject, PayloadTooLargeException, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { MAX_FILE_BYTES, type PresignResponse } from '@life-dashboard/shared';
import { z } from 'zod';
import { SessionGuard, type AuthedRequest } from '../auth/session.guard';
import { FILES, QUOTA_BYTES } from '../config';
import { DB, type Db } from '../db/db';
import { records } from '../db/schema';
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
@UseGuards(SessionGuard)
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
    if (puts.length) {
      const [usage] = await this.db
        .select({ used: sql<string>`coalesce(sum((${records.payload}->>'size')::bigint), 0)` })
        .from(records)
        .where(and(eq(records.userId, userId), eq(records.tableName, 'attachments'), isNull(records.deletedAt)));
      const adding = puts.reduce((sum, i) => sum + i.size, 0);
      if (Number(usage?.used ?? 0) + adding > this.quotaBytes) throw new PayloadTooLargeException('This account’s file storage is full.');
    }

    return {
      items: await Promise.all(
        items.map(async ({ attachmentId, kind, mime, size, mode }) => {
          // The folder comes from the session, so a link can never reach another account's files.
          const key = `users/${userId}/attachments/${attachmentId}/${kind}`;
          return { attachmentId, kind, url: mode === 'put' ? await this.files.presignPut(key, mime, size) : await this.files.presignGet(key) };
        }),
      ),
    };
  }
}
