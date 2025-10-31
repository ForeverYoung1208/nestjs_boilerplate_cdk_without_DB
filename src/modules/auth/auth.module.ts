import { Module } from "@nestjs/common";
import { ApiKeyStrategy } from "./strategies/api-key.strategy";

@Module({
  imports: [ ],
  providers: [
    ApiKeyStrategy,
  ],
  exports: [],
})
export class AuthModule {}
