import { Global, Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AuthModule } from './auth/auth.module';
import { DB, type Db } from './db/db';
import { FILES, QUOTA_BYTES } from './config';
import type { FileStore } from './files/file-store';
import { HealthController } from './health.controller';
import { SyncModule } from './sync/sync.module';

export type AppOptions = { db: Db; files: FileStore; quotaBytes: number };

@Global()
@Module({})
class CoreModule {
  static register(options: AppOptions): DynamicModule {
    const providers = [
      { provide: DB, useValue: options.db },
      { provide: FILES, useValue: options.files },
      { provide: QUOTA_BYTES, useValue: options.quotaBytes },
    ];
    return { module: CoreModule, providers, exports: providers };
  }
}

@Module({ controllers: [HealthController] })
class AppModule {
  static register(options: AppOptions): DynamicModule {
    return { module: AppModule, imports: [CoreModule.register(options), AuthModule, SyncModule] };
  }
}

export async function createApp(options: AppOptions): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(options), { logger: process.env.NODE_ENV === 'test' ? false : undefined, bodyParser: false });
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '5mb' });
  // Requests arrive through Vercel's rewrite, one hop away.
  app.set('trust proxy', 1);
  return app;
}
