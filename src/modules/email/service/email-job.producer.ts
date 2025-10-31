import { Injectable } from '@nestjs/common';
import { ISendMailOptions } from '@nestjs-modules/mailer/dist/interfaces/send-mail-options.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { EMAIL_QUEUE_NAME, EMAIL_SEND_JOB_NAME } from '../../../constants/queues';
import { Queue } from 'bullmq';

@Injectable()
export class EmailJobProducer {
  constructor(@InjectQueue(EMAIL_QUEUE_NAME) private emailQueue: Queue) {}

  async addJob(options: ISendMailOptions) {
    await this.emailQueue.add(EMAIL_SEND_JOB_NAME, options);
  }
}
