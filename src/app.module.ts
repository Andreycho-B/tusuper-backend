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
      envFilePath: resolveEnvFile(),
      ignoreEnvFile: !resolveEnvFile(),
      load: [config],
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().optional(),
        POSTGRES_DB: Joi.string().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        POSTGRES_USER: Joi.string().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        POSTGRES_PASSWORD: Joi.string().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        POSTGRES_PORT: Joi.number().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        POSTGRES_HOST: Joi.string().when('DATABASE_URL', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.alternatives()
          .try(Joi.number(), Joi.string())
          .required(),
        FRONTEND_URL: Joi.string().uri().required(),
        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
        MAIL_USER: Joi.string().required(),
        MAIL_PASSWORD: Joi.string().required(),
        MAIL_FROM: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
        CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
        CLOUDINARY_API_KEY: Joi.string().optional(),
        CLOUDINARY_API_SECRET: Joi.string().optional(),
        SEED_SECRET: Joi.string().min(16).optional(),
        ADMIN_EMAIL: Joi.string().email().optional(),
        ADMIN_PASSWORD: Joi.string().min(8).optional(),
        ADMIN_FIRST_NAME: Joi.string().optional(),
        ADMIN_LAST_NAME: Joi.string().optional(),
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
