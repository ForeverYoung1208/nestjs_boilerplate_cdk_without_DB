import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mockEventTypesService } from '../../events/event-types/mocks/event-types.service.mock';
import { EventTypesService } from '../../events/event-types/services/event-types.service';
import { mockUsersService } from '../../users/mocks/user.service.mock';
import { userStub } from '../../users/mocks/user.stub';
import { UsersService } from '../../users/services/users.service';
import { mockMailerService } from '../mocks/mailer.service.mock';
import { mockMessageProducerService } from '../mocks/message.producer.service.mock';
import { EmailParams, EmailResults, EmailService } from './email.service';
import { EmailJobProducerService } from './email-job.producer.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersRepository } from '../../users/services/users.repository';
import { mockUsersRepository } from '../../users/mocks/user.repository.mock';
import { mockAuthService } from '../../auth/mocks/auth.service.mock';
import { EventsHandlerService } from '../../utils/events-handler/events-handler.service';
import { AuthService } from '../../auth/services/auth.service';
import { EventsService } from '../../events/services/events.service';
import { EventsRepository } from '../../events/services/events.repository';
import { mockEventsRepository } from '../../events/mocks/events.repository.mock';
import { EventsHistoryRepository } from '../../events/services/events-history.repository';
import { mockEventsHistoryRepository } from '../../events/mocks/events-history.repository.mock';
import { mockEventsService } from '../../events/mocks/events.service.mock';
import {
  eventAnniversaryStub,
  eventVacationStub,
  eventVacationUnapprovedStub,
} from '../../events/mocks/event.stub';
import { EventStatus } from '../../events/dto/in-find-event.dto';

import { toMatchFile } from 'jest-file-snapshot';
import { normalizeAttachmentsTimestamp } from '../../../test/helpers/normalize-attachment-timestamps';
import { developerStub } from '../../users/mocks/user-developer.stub';
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
        EventsHandlerService,

        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: EventTypesService,
          useValue: mockEventTypesService,
        },
        {
          provide: EmailJobProducerService,
          useValue: mockMessageProducerService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(EventsHistoryRepository),
          useValue: mockEventsHistoryRepository,
        },
        {
          provide: getRepositoryToken(EventsRepository),
          useValue: mockEventsRepository,
        },
        {
          provide: getRepositoryToken(UsersRepository),
          useValue: mockUsersRepository,
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
        to: userStub.email,
        subject: emailParams.subject,
        html: expect.any(String),
        attachments: expect.any(Array),
      };

      await emailService.sendEmail(userStub.email, emailParams);
      expect(mockMessageProducerService.sendMessage).toHaveBeenCalledWith(
        expectCallParams,
      );
    });

    it('should return EmailResults.OK if pass to emailService.sendMail email:userStub.email in params', async () => {
      const res = await emailService.sendEmail(userStub.email, emailParams);
      expect(res).toBe(true);
    });

    it('should not return EmailResults.OK if pass to emailService.sendMail bad email in params', async () => {
      const res = await emailService.sendEmail('bad email', emailParams);
      expect(res).not.toBe(EmailResults.OK);
    });
  });

  describe('test email builders, without access to fonts cdn', () => {
    it('tests email snapshot when using dailyEventsDigestEmailBuilder', () => {
      const e = eventAnniversaryStub;
      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(
          emailService.dailyEventsDigestEmailBuilder.build({
            addresseeName: e.user?.name || '',
            eventCardsData: [
              {
                userName: e.user?.name || '',
                userSurname: e.user?.surname || '',
                eventType: e.eventType.key as string,
                eventTypeTitle: e.eventType.title as string,
                eventStatus: EventStatus.approved,
                eventStart: e.startDate,
                eventEnd: e.endDate,
              },
            ],
            linkToCalendar: '/test/link/to/calendar',
          }),
        );
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath(`dailyEventsDigestEmailBuilder.html`),
      );
    });

    it('tests email snapshot when using eventForApprovalEmailBuilder', () => {
      const e = eventVacationUnapprovedStub;
      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(
          emailService.eventForApprovalEmailBuilder.build({
            addresseeName: e.user?.name || '',
            eventCardsData: [
              {
                userName: e.user?.name || '',
                userSurname: e.user?.surname || '',
                eventType: e.eventType.key as string,
                eventTypeTitle: e.eventType.title as string,
                eventStatus: EventStatus.approved,
                eventStart: e.startDate,
                eventEnd: e.endDate,
              },
            ],
            buttonLink: '/test/button/link',
          }),
        );
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath(`eventForApprovalEmailBuilder.html`),
      );
    });
    it('tests email snapshot when using userAnniversaryGreetingEmailBuilder', () => {
      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(
          emailService.userAnniversaryGreetingEmailBuilder.build({
            addresseeName: userStub.name,
            numberOfYears: 10,
            photo: '/some/url/of/image',
          }),
        );
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath(`userAnniversaryGreetingEmailBuilder.html`),
      );
    });
    it('tests email snapshot when using userBirthdayEmailBuilder', () => {
      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(
          emailService.userBirthdayEmailBuilder.build({
            addresseeName: userStub.name,
          }),
        );
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath(`userBirthdayEmailBuilder.html`),
      );
    });
    it('tests email snapshot when using userBirthdayRemindSingleEmailBuilder', () => {
      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(
          emailService.userBirthdayRemindSingleEmailBuilder.build({
            addresseeName: userStub.name,
            birthdayUser: {
              ...developerStub,
              fullName: developerStub.name + ' ' + developerStub.surname,
              photo: '/some/url/of/image',
              position: 'developer',
            },
          }),
        );
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath(`userBirthdayRemindSingleEmailBuilder.html`),
      );
    });
    it('tests email snapshot when using userEventApproveDeclineEmailBuilder', () => {
      const e = eventVacationStub;
      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(
          emailService.userEventApproveDeclineEmailBuilder.build({
            addresseeName: userStub.name,
            buttonLink: '/test/button/link',
            eventCardsData: [
              {
                userName: e.user?.name || '',
                userSurname: e.user?.surname || '',
                eventType: e.eventType.key as string,
                eventTypeTitle: e.eventType.title as string,
                eventStatus: EventStatus.approved,
                eventStart: e.startDate,
                eventEnd: e.endDate,
              },
            ],
            isLimitWarningShown: true,
          }),
        );
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath(`userEventApproveDeclineEmailBuilder.html`),
      );
    });
    it('tests email snapshot when using userRegistrationInvitationEmailBuilder', () => {
      const r = emailService.userRegistrationInvitationEmailBuilder.build({
        registerLink: 'test register link',
      });

      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(r);

      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath('userRegistrationInvitationEmailBuilder.html'),
      );
    });
    it('tests email snapshot when using userResetPasswordEmailBuilder', () => {
      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(
          emailService.userResetPasswordEmailBuilder.build({
            addresseeName: userStub.name,
            linkToReset: 'test link to reset password',
          }),
        );
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath('userResetPasswordEmailBuilder.html'),
      );
    });
    it('tests email snapshot when using userVacationBalanceRemindEmailBuilder and vacationBalance is more than maximum limit', () => {
      const { attachments, contentHtml, subject } =
        normalizeAttachmentsTimestamp(
          emailService.userVacationBalanceRemindEmailBuilder.build({
            addresseeName: userStub.name,
            linkToCalendar: '/test/link/to/calendar',
            vacationBalance: 30,
          }),
        );
      expect({ attachments, subject }).toMatchSnapshot();
      expect(contentHtml).toMatchFile(
        snapshotsPath('userVacationBalanceRemindEmailBuilder.html'),
      );
    });
  });
});
