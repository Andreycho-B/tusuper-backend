import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';

import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { resolveEnvFile } from './environments';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { ModulesModule } from './modules/modules.module';
import config from './config';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MailModule } from './mail/mail.module';
import { SeedModule } from './seed/seed.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.SKIP_ENV_FILE
        ? undefined
        : environments[
            (process.env.NODE_ENV || 'dev') as keyof typeof environments
          ],
      ignoreEnvFile: !!process.env.SKIP_ENV_FILE,
      load: [config],
      isGlobal: true,
      validationSchema: Joi.object({
        // DATABASE_URL: connection string from Clever Cloud / Render.
        // When present, individual POSTGRES_* vars are optional.
        DATABASE_URL: Joi.string().uri().optional(),
        POSTGRES_DB: Joi.string().optional(),
        POSTGRES_USER: Joi.string().optional(),
        POSTGRES_PASSWORD: Joi.string().optional(),
        POSTGRES_PORT: Joi.number().optional(),
        POSTGRES_HOST: Joi.string().optional(),
        // JWT_SECRET: minimo 32 caracteres. Generar con:
        // node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.number().default(86400),
        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
        MAIL_USER: Joi.string().required(),
        MAIL_PASSWORD: Joi.string().required(),
        MAIL_FROM: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),
        // FRONTEND_URL: comma-separated whitelist of allowed CORS origins.
        // Example single env: "https://app.tusuper.com"
        // Example multi env:  "https://app.tusuper.com,https://staging.tusuper.com"
        // The "*" wildcard is forbidden by the regex below.
        FRONTEND_URL: Joi.string()
          .pattern(/^(?!.*\*).+$/, { name: 'no-wildcard' })
          .required(),
        // CLOUDINARY_*: optional for deployments without image uploads
        CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
        CLOUDINARY_API_KEY: Joi.string().optional(),
        CLOUDINARY_API_SECRET: Joi.string().optional(),
        // SEED_SECRET / ADMIN_*: required only for production seed
        SEED_SECRET: Joi.string().optional(),
        ADMIN_EMAIL: Joi.string().email().optional(),
        ADMIN_PASSWORD: Joi.string().min(8).optional(),
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ModulesModule,
    OrdersModule,
    InventoryModule,
    NotificationsModule,
    MailModule,
    SeedModule,
    DashboardModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
