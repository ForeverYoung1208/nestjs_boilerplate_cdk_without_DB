import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../entities/post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post]), EmailModule],
  providers: [PostsController, PostsService],
  exports: [PostsController, PostsService],
})
export class PostsModule {}
