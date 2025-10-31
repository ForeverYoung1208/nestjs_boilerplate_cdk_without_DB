import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES } from '../constants/errors';

export class BadRequestExceptionWithCode extends BadRequestException {
  constructor(errorCode: ERROR_CODES) {
    super(errorCode);
  }
}
