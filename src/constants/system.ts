export const ENV_LOCAL = 'local';
export const ENV_DEV = 'development';
export const ENV_STAGING = 'staging';
export const ENV_PROD = 'production';
export const ENV_TEST = 'test';

export const REGEX_DATE_STRING = new RegExp(`\\d{4}-\\d{2}-\\d{2}`);
export const DATE_FORMAT = 'YYYY-MM-DD';

export const SECONDS_IN_DAY = 24 * 60 * 60;

export enum MailerTransport {
  smtp = 'smtp',
  log = 'log',
}