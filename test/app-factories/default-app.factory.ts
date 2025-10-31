import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { validationPipeConfig } from '../../src/config/validation-pipe.config';

export const appBuilder = async (): Promise<INestApplication> => {
  initializeTransactionalContext();

  const appModule = await Test.createTestingModule({
    imports: [AppModule],
  })
  // Sample of the possible provider overriding:
  // .overrideProvider(MailerService)
  // .useValue(mockMailerService)
  // .overrideProvider(AwsService)
  // .useValue(mockAwsService)
  .compile();

  const app = appModule.createNestApplication();
  
  app.useGlobalPipes(new ValidationPipe(validationPipeConfig));
  
  return app;  
};
