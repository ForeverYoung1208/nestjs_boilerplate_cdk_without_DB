import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mockMailerService } from '../mocks/mailer.service.mock';
import { mockMessageProducerService } from '../mocks/message.producer.service.mock';
import { EmailParams, EmailResults, EmailService } from './email.service';
import { EmailJobProducerService } from './email-job.producer.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { toMatchFile } from 'jest-file-snapshot';
import { DEFAULT_TEST_EMAIL } from '../../../constants/system';
expect.extend({ toMatchFile });

const snapshotsPath = (fileName: string) =>
  `${__dirname}/__snapshots__/${fileName}`;

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        ConfigService,

        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: EmailJobProducerService,
          useValue: mockMessageProducerService,
        },
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(emailService).toBeDefined();
  });

  describe('when sendEmail(emailParams) called', () => {
    const emailParams: EmailParams = {
      subject: 'test subject',
      contentHtml: 'some content',
      attachments: [
        { filename: 'test', path: 'test', cid: 'test', link: 'test' },
      ],
    };

    it('should call this.mailerService.sendMail with proper params', async () => {
      const expectCallParams = {
        to: DEFAULT_TEST_EMAIL,
        subject: emailParams.subject,
        html: expect.any(String),
        attachments: expect.any(Array),
      };

      await emailService.sendEmail(DEFAULT_TEST_EMAIL, emailParams);
      expect(mockMessageProducerService.createEmailJob).toHaveBeenCalledWith(
        expectCallParams,
      );
    });

    it('should return EmailResults.OK if pass to emailService.sendMail email:userStub.email in params', async () => {
      const res = await emailService.sendEmail(DEFAULT_TEST_EMAIL, emailParams);
      expect(res).toBe(true);
    });

    it('should not return EmailResults.OK if pass to emailService.sendMail bad email in params', async () => {
      const res = await emailService.sendEmail('bad email', emailParams);
      expect(res).not.toBe(EmailResults.OK);
    });
  });

  describe('test email builders, without access to fonts cdn', () => {
    it('tests email snapshot when using newPostCreatedEmailBuilder', () => {
      const { attachments, contentHtml, subject } =
        emailService.newPostCreatedEmailBuilder.build({
          newPost: {
            id: 1,
            title: 'test',
            content: 'test',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath(`newPostCreatedEmailBuilder.html`),
      );
    });
  });
});
