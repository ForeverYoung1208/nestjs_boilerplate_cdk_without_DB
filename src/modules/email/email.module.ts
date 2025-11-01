import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './service/email.service';
import { EmailJobProducerService } from './service/email-job.producer.service';
import { EMAIL_QUEUE_NAME } from '../../constants/queues';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('mailerConfig')(),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('queueConfig')(),
    }),
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
      defaultJobOptions: {
        removeOnComplete: {
          age: 60 * 60 * 24, // 1 day in seconds
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7, // 7 days in seconds
        },
        attempts: 3, // Retry 3 times
        backoff: {
          type: 'fixed',
          delay: 1000 * 60 * 5, // 5 minute
        },
      },
    }),
  ],
  providers: [EmailService, EmailJobProducerService],
  exports: [EmailService],
})
export class EmailModule {}
