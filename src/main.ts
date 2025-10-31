import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ENV_DEV, ENV_LOCAL, ENV_STAGING } from './constants/system';
import { validationPipeConfig } from './config/validation-pipe.config';
import { AuthTypes } from './modules/auth/constants';
import { initializeTransactionalContext } from 'typeorm-transactional';

export async function bootstrap() {
  initializeTransactionalContext();
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const currentEnv = configService.get('NODE_ENV');
  const port = configService.get('PORT');
  const corsOrigin = configService.get('SITE_ORIGIN');

  Logger.overrideLogger(new Logger('API'));

  app.useGlobalPipes(new ValidationPipe(validationPipeConfig));
  app.enableShutdownHooks();
  app.enableCors({ origin: corsOrigin });

  // Load swagger, load only for local, staging and dev environments
  if ([ENV_LOCAL, ENV_STAGING, ENV_DEV].includes(currentEnv)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('API')
      .setDescription(
        `Api description for environment ${currentEnv} version test5`,
      )
      .setVersion('test5')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          in: 'header',
          bearerFormat: AuthTypes.JWT,
          description: 'Used for user auth',
        },
        AuthTypes.JWT,
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'Used for api key auth',
        },
        AuthTypes.API_KEY,
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }
  await app.listen(process.env.PORT);
  Logger.verbose(`listen to port ${port}`);
}
bootstrap();
