import { DataSource } from 'typeorm';
import config from '../config';
import * as dotenv from 'dotenv';
import { resolveEnvFile } from '../environments';
import {
  isManagedPostgres,
  resolveDatabaseConfig,
} from '../config/database.config';

import { join } from 'node:path';

const envFile = resolveEnvFile();
if (envFile) {
  dotenv.config({ path: envFile });
}
const db = resolveDatabaseConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: db.host,
  port: db.port,
  username: db.user,
  password: db.password,
  database: db.name,
  synchronize: process.env.NODE_ENV === 'test',
  logging: process.env.NODE_ENV !== 'test',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  ...(isManagedPostgres() ? { ssl: { rejectUnauthorized: false } } : {}),
});
