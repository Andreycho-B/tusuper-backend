import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
// @ts-ignore
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigType } from '@nestjs/config';
import config from '../config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configType: ConfigType<typeof config>) => ({
        transport: {
          host: configType.mail.host,
          port: configType.mail.port,
          secure: false, // true para 465, false para los demás
          auth: {
            user: configType.mail.user,
            pass: configType.mail.password,
          },
        },
        defaults: {
          from: configType.mail.from,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
