import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { envFilePath } from '..';
import { dataSourceOptions } from './data-source-options.config';

ConfigModule.forRoot({
  isGlobal: true,
  load: [dataSourceOptions],
  envFilePath: envFilePath(),
});

export default new DataSource(dataSourceOptions());
