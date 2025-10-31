import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export const dataSourceOptions = registerAs(
  'data-source-options',
  (): DataSourceOptions => {
    console.log(`[PID:${process.pid}] Database config:`, {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_DATABASE,
      username: process.env.DB_USERNAME ? '***' : 'MISSING',
      password: process.env.DB_PASSWORD ? '***' : 'MISSING',
    });
    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_DATABASE,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      synchronize: false,
      entities: [__dirname + '/../../entities/**/*.entity.{js,ts}'],
      migrations: ['dist/db/migrations/**/*.js'],
      logging: process.env.TYPEORM_LOGGING === 'true',
      extra: {
        max: 20,
        // idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      },
    };
  },
);
