import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigType } from '@nestjs/config';
import config from '../config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configType: ConfigType<typeof config>) => {
        const { user, host, name, password, port, url, ssl } =
          configType.dataBase;

        const baseConfig = {
          type: 'postgres' as const,
          synchronize: process.env.NODE_ENV === 'test',
          autoLoadEntities: true,
        };

        if (url) {
          return {
            ...baseConfig,
            url,
            ssl: ssl ? { rejectUnauthorized: false } : false,
          };
        }

        return {
          ...baseConfig,
          host,
          port,
          username: user,
          password,
          database: name,
          ssl: ssl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
