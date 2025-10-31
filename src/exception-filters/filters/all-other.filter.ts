import { Catch, ExceptionFilter, HttpStatus, Injectable } from '@nestjs/common';
import { BaseExceptionFilter, IExceptionProcessResult } from '../base.filter';

@Injectable()
@Catch()
export class AllOtherExceptionsFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  processException(exception: Error | any): IExceptionProcessResult {
    this.logger.error(exception.message, exception.stack, exception.name);
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
    };
  }
}
