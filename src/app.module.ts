import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config, { envFilePath } from './config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsModule } from './modules/posts/posts.module';
import { PostsController } from './modules/posts/posts.controller';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      validationSchema: config().envValidationConfig,
      envFilePath: envFilePath(),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('databaseConfig')(),
      dataSourceFactory: async (options) =>
        addTransactionalDataSource(new DataSource(options)),
    }),
    AuthModule,
    PostsModule,
  ],
  controllers: [AppController, PostsController],
  providers: [AppService],
})
export class AppModule {}
