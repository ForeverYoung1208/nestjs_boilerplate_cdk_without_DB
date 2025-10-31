import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { validationPipeConfig } from '../../src/config/validation-pipe.config';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { ClassConstructor } from 'class-transformer';
import { FakeEntitiesModule } from '../fixtures/fake-entities/fake-entities.module';
import { BaseFakeEntityFactory } from '../fixtures/fake-entities/entity-factories/base.factory';


export const appWithFakeFactoriesBuilder = async <
  T extends BaseFakeEntityFactory<any>[],
>(
  fakeFactoriesConstructors: [...{ [K in keyof T]: ClassConstructor<T[K]> }],
): Promise<{
  app: INestApplication;
  factories: T;
}> => {
  initializeTransactionalContext();

  const appModule = await Test.createTestingModule({
    imports: [AppModule, FakeEntitiesModule],
  }).compile();

  const app = appModule.createNestApplication();

  app.useGlobalPipes(new ValidationPipe(validationPipeConfig));
  await app.init();

  const factories = fakeFactoriesConstructors.map((ffc) => {
    return app.get(ffc);
  });

  return {
    app,
    factories: factories as T,
  };
};
