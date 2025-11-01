import { MailerService } from '@nestjs-modules/mailer';
import { MockType } from '../../../types-common';
import { EmailResults } from '../service/email.service';

export const mockMailerService: MockType<MailerService> = {
  sendMail: jest.fn((mailerParams) => {
    if (mailerParams.to === 'bad email') {
      return { response: 'some error message' };
    }
    return { response: EmailResults.OK };
  }),
};
