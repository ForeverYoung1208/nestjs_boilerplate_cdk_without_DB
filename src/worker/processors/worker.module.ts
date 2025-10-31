import {
  Logger,
  Module
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config, { envFilePath } from '../../config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './email.processor';
import { EMAIL_QUEUE_NAME } from '../../constants/queues';
import { EmailModule } from '../../modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      validationSchema: config().envValidationConfig,
      envFilePath: envFilePath(),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('databaseConfig')(),
      dataSourceFactory: async (options) =>
        addTransactionalDataSource(new DataSource(options)),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('queueConfig')(),
    }),
    BullModule.registerQueue(
      { name: EMAIL_QUEUE_NAME },
    ),
    EmailModule,
  ],
  providers: [
    EmailProcessor,
    // { provide: Logger, useFactory: () => new Logger('Worker') },
  ],
})
export class WorkerModule {}
