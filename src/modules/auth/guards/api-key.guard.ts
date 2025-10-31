import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { REQUEST_KEY_API_KEY } from '../constants';

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
  constructor() {
    super({ property: REQUEST_KEY_API_KEY });
  }
}
