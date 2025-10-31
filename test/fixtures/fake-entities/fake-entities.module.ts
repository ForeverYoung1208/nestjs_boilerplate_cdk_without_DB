import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../../src/entities/post.entity';
import { FakePostsFactory } from './entity-factories/fake-posts.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
    ]),
  ],
  providers: [
    FakePostsFactory,
    
  ],
  exports: [
    FakePostsFactory,
  ],
})
export class FakeEntitiesModule {}
