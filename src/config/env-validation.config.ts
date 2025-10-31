import * as Joi from 'joi';
import {
  ENV_DEV,
  ENV_LOCAL,
  ENV_PROD,
  ENV_STAGING,
  ENV_TEST,
  MailerTransport,
} from '../constants/system';

export const envValidationConfig = Joi.object({
  PORT: Joi.number().required(),
  NODE_ENV: Joi.string()
    .valid(ENV_LOCAL, ENV_DEV, ENV_STAGING, ENV_PROD, ENV_TEST)
    .required(),

  SITE_ORIGIN: Joi.string().uri().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_DATABASE: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.string().required(),
  BULL_TASKS_TTL_DAYS: Joi.number(),

  TYPEORM_LOGGING: Joi.string().valid('true', 'false'),

  API_KEY: Joi.string().required(),

  MAILER_TRANSPORT: Joi.string().valid(...Object.values(MailerTransport)),
  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.string().required(),
  MAIL_ENCRYPTION: Joi.string().valid('true', 'false').default('false'),
  MAIL_TLS: Joi.string().valid('true', 'false').default('true'),
  MAIL_USERNAME: Joi.string().required(),
  MAIL_PASSWORD: Joi.string().required(),
  MAIL_FROM_EMAIL: Joi.string().required(),

  COMPANY_NAME: Joi.string().required(),
});
