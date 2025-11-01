import { MockType } from '../../../types-common';
import { EmailBuildResult } from '../base-email-builder';
import {
  EmailParams,
  EmailResults,
  EmailService,
} from '../service/email.service';

const buildEmailMock: EmailBuildResult = {
  subject: 'test subject',
  contentHtml: '<div>test content<div>',
  attachments: [],
};

export const mockEmailService: MockType<EmailService> = {
  sendEmail: jest.fn((emailAddress, emailParams: EmailParams) => {
    return emailAddress === 'test@example.com';
  }),

  newPostCreatedEmailBuilder: {
    build: jest.fn(() => buildEmailMock),
  },
};
