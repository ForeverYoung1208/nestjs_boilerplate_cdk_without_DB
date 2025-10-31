import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';
import { dataSourceOptions } from './data-source-options.config';

export const databaseConfig = registerAs(
  'database-config',
  (): TypeOrmModuleOptions => dataSourceOptions(),
);
