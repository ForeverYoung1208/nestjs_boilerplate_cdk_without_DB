import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from 'passport-custom';
import { HEADER_KEY_API_KEY } from "../constants";
import { Request } from "express";

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private configService: ConfigService) {
    super()
  }
  
  async validate(request: Request): Promise<boolean> {
    const token = request.header(HEADER_KEY_API_KEY)
    if (!token || token !== this.configService.get('API_KEY')) {
      throw new UnauthorizedException();
    }
    return true;
  }
}