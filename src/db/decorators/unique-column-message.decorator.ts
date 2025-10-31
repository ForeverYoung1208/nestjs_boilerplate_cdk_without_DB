import { getMetadataArgsStorage } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common';

export const UNIQUE_COLUMN_MESSAGE_KEY = 'constraintMessage';

export function UniqueColumnMessage(options: {
  message: string;
}): PropertyDecorator {
  return function (object: any, propertyName: string) {
    const targetColumns = getMetadataArgsStorage().filterColumns(
      object.constructor,
    );
    const column = targetColumns.find((c) => c.propertyName === propertyName);
    if (column?.options?.unique === true) {
      Object.assign(column.options, {
        [UNIQUE_COLUMN_MESSAGE_KEY]: options.message,
      });
    } else {
      throw new InternalServerErrorException(
        `"${propertyName}" column with unique constraint is not found`,
      );
    }
  };
}
