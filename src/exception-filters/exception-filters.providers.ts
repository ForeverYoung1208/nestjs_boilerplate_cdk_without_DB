import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';


import { AllOtherExceptionsFilter } from './filters/all-other.filter';
import { CommonExceptionsFilter } from './filters/common-exceptions.filter';
import { QueryFailedErrorFilter } from './filters/query-failed.filter';
import { ValidationFilter } from './filters/validation.filter';
import { BadRequestExceptionWithCodeFilter } from './filters/bad-request-exception-with-code.filter';
import { IExceptionConfig } from './base.filter';
import { APP_FILTER } from '@nestjs/core';
import { EXCEPTION_FILTER_CONFIG_TOKEN } from './constants';
import { ENV_DEV, ENV_LOCAL, ENV_STAGING } from '../constants/system';

export const exceptionFiltersProviders: Provider[] = [
  {
    provide: EXCEPTION_FILTER_CONFIG_TOKEN,
    inject: [ConfigService],
    useFactory: (config: ConfigService): IExceptionConfig => {
      const doAttachStack = [ENV_DEV, ENV_LOCAL, ENV_STAGING].includes(
        config.get('NODE_ENV'),
      );

      return { doAttachStack };
    },
  },
  {
    provide: APP_FILTER,
    useClass: AllOtherExceptionsFilter,
  },
  {
    provide: APP_FILTER,
    useClass: CommonExceptionsFilter,
  },
  {
    provide: APP_FILTER,
    useClass: QueryFailedErrorFilter,
  },
  {
    provide: APP_FILTER,
    useClass: ValidationFilter,
  },
  {
    provide: APP_FILTER,
    useClass: BadRequestExceptionWithCodeFilter,
  },
];
