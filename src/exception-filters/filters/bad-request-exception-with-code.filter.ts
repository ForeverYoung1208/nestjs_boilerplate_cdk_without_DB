import { Catch, ExceptionFilter, HttpStatus, Inject } from '@nestjs/common';
import { BadRequestExceptionWithCode } from '../../exceptions/bad-request-exception';
import {
  BaseExceptionFilter,
  IExceptionConfig,
  IExceptionProcessResult,
} from '../base.filter';
import { EXCEPTION_FILTER_CONFIG_TOKEN } from '../constants';
import { isErrorCode } from '../../helpers/isErrorCode';

@Catch(BadRequestExceptionWithCode)
export class BadRequestExceptionWithCodeFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  constructor(
    @Inject(EXCEPTION_FILTER_CONFIG_TOKEN)
    protected readonly exceptionConfig: IExceptionConfig,
  ) {
    super(exceptionConfig);
  }

  processException(exception: Error): IExceptionProcessResult {
    this.logger.error(exception.message, exception.stack, exception.name);
    if (isErrorCode(exception.message)) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        errorCode: exception.message,
        message: exception.message,
      };
    }

    return {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errorCode: undefined,
      message: exception.message,
    };
  }
}
