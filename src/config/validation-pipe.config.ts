import { ValidationPipeOptions } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ValidationException } from '../exceptions/validation-exception';

export const validationPipeConfig: ValidationPipeOptions = {
  whitelist: true,
  errorHttpStatusCode: 422,
  exceptionFactory(errors: ValidationError[]) {
    return new ValidationException(
      errors.reduce((arr, e) => {
        arr.push(getDetails(e));
        return arr;
      }, []),
    );
  },
};

const getDetails = (error: ValidationError) => {
  if (error.children && error.children.length) {
    return { [error.property]: error.children.map((e) => getDetails(e)) };
  }
  return { [error.property]: Object.values(error.constraints) };
};
