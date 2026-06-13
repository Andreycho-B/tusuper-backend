import { DataSource } from 'typeorm';
import config from '../config';
import * as dotenv from 'dotenv';
import { resolveEnvFile } from '../environments';
import {
  isManagedPostgres,
  resolveDatabaseConfig,
} from '../config/database.config';

import { join } from 'node:path';

const envFile =
  process.env.SKIP_ENV_FILE
    ? undefined
    : environments[process.env.NODE_ENV as keyof typeof environments] ||
      environments.dev;

if (envFile) {
  dotenv.config({ path: envFile });
}

const configuration = config();

const baseOptions = {
  type: 'postgres' as const,
  synchronize: process.env.NODE_ENV === 'test',
  logging: process.env.NODE_ENV !== 'test',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
};

export const AppDataSource = new DataSource(
  configuration.dataBase.url
    ? {
        ...baseOptions,
        url: configuration.dataBase.url,
        ssl: configuration.dataBase.ssl
          ? { rejectUnauthorized: false }
          : false,
      }
    : {
        ...baseOptions,
        host: configuration.dataBase.host,
        port: configuration.dataBase.port,
        username: configuration.dataBase.user,
        password: configuration.dataBase.password,
        database: configuration.dataBase.name,
        ssl: configuration.dataBase.ssl
          ? { rejectUnauthorized: false }
          : false,
      },
);
