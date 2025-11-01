import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EMAIL_SEND_JOB_NAME } from '../constants/queues';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';

@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost{
  constructor(
    private readonly mailerService: MailerService,
    private readonly logger: Logger,
  ) {
    super()
  }
  async process(job: Job<any, any, string>): Promise<void> {
    try {
      switch (job.name) {
        case EMAIL_SEND_JOB_NAME:
          const res = await this.mailerService.sendMail(job.data);
          this.logger.log(
            `Email sent to ${job.data.to} with subject ${job.data.subject}`,
          );
          return;
        default:
          this.logger.log(`Unknown job name: ${job.name}`);
          return;
      }
    } catch (error) {
      this.logger.error(`Failed to process email job: ${error.message}`);
      throw error;
    }    
  }
}

