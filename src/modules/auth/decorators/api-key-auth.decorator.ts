import { applyDecorators, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthTypes } from '../constants';
import { ApiKeyGuard } from '../guards/api-key.guard';

export const ApiKeyAuth = () => {
  return applyDecorators(
    ApiBearerAuth(AuthTypes.API_KEY),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Api Key is not valid or not exists',
    }),
    UseGuards(ApiKeyGuard),
  );
};
