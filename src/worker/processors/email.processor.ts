import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EMAIL_SEND_JOB_NAME } from '../../constants/queues';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost{
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    super()
  }
  async process(job: Job<any, any, string>): Promise<void> {
    try {
      switch (job.name) {
        case EMAIL_SEND_JOB_NAME:
          const res = await this.mailerService.sendMail(job.data);
          Logger.log(
            `Email sent to ${job.data.to} with subject ${job.data.subject}`,
          );
          return;
        default:
          Logger.log(`Unknown job name: ${job.name}`);
          return;
      }
    } catch (error) {
      Logger.error(`Failed to process email job: ${error.message}`);
      throw error;
    }    
  }
}

