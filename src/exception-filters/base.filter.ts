import {
  ArgumentsHost,
  ExceptionFilter,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ERROR_CODES } from '../constants/errors';
import { EXCEPTION_FILTER_CONFIG_TOKEN } from './constants';

export interface IExceptionProcessResult {
  statusCode: number;
  errorCode?: ERROR_CODES;
  message?: string;
  details?: string | object;
}
interface IErrorResponse extends IExceptionProcessResult {
  name?: string;
  stack?: string;
}

export interface IExceptionConfig {
  doAttachStack: boolean;
}

@Injectable()
export abstract class BaseExceptionFilter implements ExceptionFilter {
  protected logger: Logger = new Logger(this.constructor.name);
  constructor(
    @Inject(EXCEPTION_FILTER_CONFIG_TOKEN)
    protected readonly exceptionConfig: IExceptionConfig,
  ) {}

  abstract processException(exception: Error): IExceptionProcessResult;

  catch(exception: Error, host: ArgumentsHost) {
    const errorResponse: IErrorResponse = {
      ...this.processException(exception),
    };

    if (this.exceptionConfig.doAttachStack) {
      errorResponse.name = exception.name;
      errorResponse.stack = exception.stack;
    }

    host
      .switchToHttp()
      .getResponse()
      .status(errorResponse.statusCode)
      .json(errorResponse);
  }
}