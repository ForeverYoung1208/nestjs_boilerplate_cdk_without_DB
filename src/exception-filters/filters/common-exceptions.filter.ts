import {
  Catch,
  ExceptionFilter,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseExceptionFilter, IExceptionProcessResult } from '../base.filter';

@Injectable()
@Catch(
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
)
export class CommonExceptionsFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  processException(
    exception: UnauthorizedException | ForbiddenException | NotFoundException,
  ): IExceptionProcessResult {
    return {
      statusCode: exception.getStatus(),
      message: exception.message,
    };
  }
}
