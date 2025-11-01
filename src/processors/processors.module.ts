import {
  Logger,
  Module
} from '@nestjs/common';
import { EmailProcessor } from './email.processor';

@Module({
  providers: [
    EmailProcessor,
    { provide: Logger, useFactory: () => new Logger('PROCESSOR') },
  ],
})
export class ProcessorsModule {}
