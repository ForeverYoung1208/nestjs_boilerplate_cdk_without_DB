import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailJobProducerService } from './email-job.producer.service';
import { Attachment } from '../types';
import { NewPostCreatedEmailBuilder } from '../builders/new-post-created';

export interface EmailParams {
  subject: string;
  contentHtml: string;
  attachments?: Array<Attachment | undefined>;
}

export enum EmailResults {
  OK = '250 OK',
}

@Injectable()
export class EmailService {
  protected readonly logger = new Logger(this.constructor.name);

  public newPostCreatedEmailBuilder: NewPostCreatedEmailBuilder;

  constructor(
    private readonly emailJobProducerService: EmailJobProducerService,
    private readonly configService: ConfigService,
  ) {
    this.newPostCreatedEmailBuilder = new NewPostCreatedEmailBuilder(
      this.configService,
    );
  }

  async sendEmail(
    emailAddress: string,
    { subject, contentHtml, attachments }: EmailParams,
  ): Promise<boolean> {
    if (!this.validateEmail(emailAddress)) {
      return false;
    }

    try {
      await this.emailJobProducerService.createEmailJob({
        to: emailAddress,
        subject,
        html: contentHtml,
        attachments,
      });

      this.logger.log(
        `The email "${subject}" for the user ${emailAddress} was queued for sending`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `The email "${subject}" for the user ${emailAddress} was not queued for sending: ${JSON.stringify(error)}`,
      );
      return false;
    }
  }

  validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      );
  };
}
