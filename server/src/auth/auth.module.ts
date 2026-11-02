import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountThrottlerGuard, EmailThrottlerGuard, SessionGuard, SyncAccountGuard } from './session.guard';

@Module({
  imports: [ThrottlerModule.forRoot([{ limit: Number(process.env.AUTH_RATE_LIMIT ?? 10), ttl: 60_000 }])],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, SyncAccountGuard, AccountThrottlerGuard, EmailThrottlerGuard],
  exports: [AuthService, SessionGuard, SyncAccountGuard, AccountThrottlerGuard, EmailThrottlerGuard, ThrottlerModule],
})
export class AuthModule {}
