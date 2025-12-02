import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/control_acceso';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
    const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';

    if (nodeEnv === 'test') {
      return {
        type: 'sqlite',
        database: ':memory:',
        dropSchema: true,
        autoLoadEntities: true,
        synchronize: true,
        logging: false,
      };
    }

    const isProd = nodeEnv === 'production';
    const dbUrl =
      configService.get<string>('DATABASE_URL') ?? DEFAULT_DATABASE_URL;
    const sslEnabled = configService.get<string>('DB_SSL') === 'true';

    return {
      type: 'postgres',
      url: dbUrl,
      autoLoadEntities: true,
      synchronize: !isProd,
      logging: !isProd,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    };
  },
};
