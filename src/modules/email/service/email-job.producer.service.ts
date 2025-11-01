import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ISendMailOptions } from '@nestjs-modules/mailer/dist/interfaces/send-mail-options.interface';
import * as process from 'process';
import { EMAIL_QUEUE_NAME, EMAIL_SEND_JOB_NAME } from '../../../constants/queues';
import { ENV_CI, ENV_TEST } from '../../../constants/system';

@Injectable()
export class EmailJobProducerService {
  constructor(@InjectQueue(EMAIL_QUEUE_NAME) private emailQueue: Queue) {}

  async createEmailJob(options: ISendMailOptions) {
    if (process.env.NODE_ENV === ENV_TEST || process.env.NODE_ENV === ENV_CI) {
      return;
    }
    await this.emailQueue.add(EMAIL_SEND_JOB_NAME, options);
  }
}
