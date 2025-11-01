import { MockType } from '../../../types-common';
import { EmailJobProducerService } from '../service/email-job.producer.service';

export const mockMessageProducerService: MockType<EmailJobProducerService> = {
  createEmailJob: jest.fn(),
};
