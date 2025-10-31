import { EmailJobProducer } from './email-job.producer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Post } from '../../../entities/post.entity';
import { IEmailServiceForPosts } from '../../posts/interfaces-need/email.service.interface';

@Injectable()
export class EmailService implements IEmailServiceForPosts {
  constructor(
    private readonly emailJobProducerService: EmailJobProducer,
    private readonly configService: ConfigService,
  ) {}

  async sendPostCreatedNotificationMail(
    emailAdress: string,
    post: Post,
  ): Promise<boolean> {
    const { companyName } = this.getCompanyInfo();

    await this.emailJobProducerService.addJob({
      to: emailAdress,
      subject: 'New post is created',
      template: 'new-post-email',
      context: { companyName, email: emailAdress, post },
      attachments: [],
    });

    return true;
  }

  private getCompanyInfo() {
    return {
      companyName: this.configService.get('COMPANY_NAME'),
    };
  }
}
