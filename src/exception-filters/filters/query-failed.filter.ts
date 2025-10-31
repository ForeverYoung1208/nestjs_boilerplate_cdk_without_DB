import {
  Catch,
  ExceptionFilter,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  BaseExceptionFilter,
  IExceptionConfig,
  IExceptionProcessResult,
} from '../base.filter';
import {
  EntityManager,
  getMetadataArgsStorage,
  QueryFailedError,
} from 'typeorm';
import { ERROR_CODES } from '../../constants/errors';
import { UNIQUE_COLUMN_MESSAGE_KEY } from '../../db/decorators/unique-column-message.decorator';
import {
  DB_CONSTRAINT_ERROR_CODE,
  EXCEPTION_FILTER_CONFIG_TOKEN,
} from '../constants';
import { isErrorCode } from '../../helpers/isErrorCode';
import { UnprocessableEntityException } from '@nestjs/common';

type QueryFailedErrorType = QueryFailedError & {
  code?: number;
  constraint?: string;
  table?: string;
};

@Injectable()
@Catch(QueryFailedError)
export class QueryFailedErrorFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  constructor(
    @Inject(EXCEPTION_FILTER_CONFIG_TOKEN) exceptionConfig: IExceptionConfig,
    private readonly metadata: EntityManager,
  ) {
    super(exceptionConfig);
  }

  processException(exception: QueryFailedErrorType): IExceptionProcessResult {
    let errorCode: ERROR_CODES | undefined;
    if (
      Number(exception.code) === DB_CONSTRAINT_ERROR_CODE &&
      !!exception.constraint &&
      !!exception.table
    ) {
      const constraintMessage = this.handleConstraintError(exception);
      if (!constraintMessage) {
        this.logger.error(
          `Constraint message not defined. ${exception.table}:${exception.constraint}`,
        );
      }
      if (isErrorCode(constraintMessage)) {
        errorCode = constraintMessage;
      } else {
        this.logger.error(
          `Constraint message is not consistent with error codes ${constraintMessage}`,
        );
        errorCode = undefined;
      }
    } else {
      this.logger.error(exception.message, exception.stack, exception.name);
    }

    return {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errorCode,
      message:
        (!errorCode && new UnprocessableEntityException().message) || undefined,
    };
  }

  private handleConstraintError({
    table,
    constraint,
  }: QueryFailedErrorType): string | null {
    const storage = getMetadataArgsStorage();
    const tableMetadata = storage.tables.find((t) => t.name === table);
    const columnsMetadata = storage.filterColumns(tableMetadata.target);
    const repository = this.metadata.getRepository(tableMetadata.target);
    const uniqueMetadata = repository.metadata.uniques.find(
      ({ name }) => name === constraint,
    );

    if (uniqueMetadata) {
      // Working with single column unique, should be improved to handle multiple ones
      const propertyName = uniqueMetadata?.columnNamesWithOrderingMap
        ? Object.keys(uniqueMetadata?.columnNamesWithOrderingMap).pop()
        : null;
      const message = columnsMetadata.find(
        (c) => c.propertyName === propertyName,
      )?.options?.[UNIQUE_COLUMN_MESSAGE_KEY];

      return message || null;
    }

    const targetEntity = storage.indices.find((i) => i.name === constraint)
      ?.target as any;

    return (
      targetEntity?.indexMessages?.find((im) => im.indexName === constraint)
        ?.message || null
    );
  }
}
