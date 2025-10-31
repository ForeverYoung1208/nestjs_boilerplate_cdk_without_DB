import { ENV_TEST } from '../constants/system';
import { databaseConfig } from './db/database.config';
import { envValidationConfig } from './env-validation.config';
import { mailerConfig } from './mailer.config';
import { queueConfig } from './queue.config';
import { validationPipeConfig } from './validation-pipe.config';

export const envFilePath = (): string =>
  process.env.NODE_ENV === ENV_TEST ? '.env.test' : '.env';

export default () => ({
  databaseConfig,
  envValidationConfig,
  validationPipeConfig,
  mailerConfig,
  queueConfig,
});
