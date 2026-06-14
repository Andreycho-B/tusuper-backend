/* 
    sirve para leer variables de entorno (.env)
    y ponerlas disponibles en toda la aplicacion NestJS de forma ordenada y segura.
*/
import { registerAs } from '@nestjs/config';
import { resolveDatabaseConfig } from './config/database.config';

export default registerAs('config', () => {
  const databaseUrl = process.env.DATABASE_URL;

  return {
    dataBase: {
      url: databaseUrl || undefined,
      name: process.env.POSTGRES_DB,
      port: Number.parseInt(process.env.POSTGRES_PORT || '5432', 10),
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      host: process.env.POSTGRES_HOST,
      ssl: process.env.NODE_ENV === 'prod',
    },
    mail: {
      host: process.env.MAIL_HOST,
      port: Number.parseInt(process.env.MAIL_PORT || '587', 10),
      user: process.env.MAIL_USER,
      password: process.env.MAIL_PASSWORD,
      from: process.env.MAIL_FROM,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: (() => {
        const value = Number.parseInt(process.env.JWT_EXPIRES_IN ?? '86400', 10);
        if (isNaN(value) || value <= 0) {
          throw new Error(
            'JWT_EXPIRES_IN must be a positive integer in seconds',
          );
        }
        if (value > 86400) {
          throw new Error('JWT_EXPIRES_IN must not exceed 86400 seconds (24h)');
        }
        return value;
      })(),
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    vapid: {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT || 'mailto:admin@tusuper.com',
    },
  };
});
