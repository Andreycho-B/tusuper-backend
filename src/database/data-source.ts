import { DataSource } from 'typeorm';
import config from '../config';
import * as dotenv from 'dotenv';
import { environments } from '../environments';

import { join } from 'node:path';

const envFile =
  environments[process.env.NODE_ENV as keyof typeof environments] ||
  environments.dev;
dotenv.config({ path: envFile });
const configuration = config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configuration.dataBase.host,
  port: configuration.dataBase.port,
  username: configuration.dataBase.user,
  password: configuration.dataBase.password,
  database: configuration.dataBase.name,
  synchronize: process.env.NODE_ENV === 'test',
  logging: process.env.NODE_ENV !== 'test',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
