import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigType } from '@nestjs/config';
import config from '../config';
import { isManagedPostgres } from '../config/database.config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configType: ConfigType<typeof config>) => {
        const { user, host, name, password, port } = configType.dataBase;
        const useSsl = isManagedPostgres();

        return {
          type: 'postgres',
          host,
          port,
          username: user,
          password,
          database: name,
          synchronize: process.env.NODE_ENV === 'test',
          autoLoadEntities: true,
          ...(useSsl
            ? { ssl: { rejectUnauthorized: false } }
            : {}),
        };
      },
    }),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
