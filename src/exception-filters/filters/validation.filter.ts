import {
  Catch,
  ExceptionFilter,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BaseExceptionFilter, IExceptionProcessResult } from '../base.filter';
import { ValidationException } from '../../exceptions/validation-exception';

@Injectable()
@Catch(UnprocessableEntityException, ValidationException)
export class ValidationFilter extends BaseExceptionFilter {
  processException(
    exception: UnprocessableEntityException | ValidationException,
  ): IExceptionProcessResult {
    const res = exception.getResponse();
    let details = res;
    if (
      exception instanceof ValidationException &&
      res.hasOwnProperty('message')
    ) {
      details = (res as any).message;
    }
    return {
      statusCode: exception.getStatus(),
      message: exception.message,
      details,
    };
  }
}
