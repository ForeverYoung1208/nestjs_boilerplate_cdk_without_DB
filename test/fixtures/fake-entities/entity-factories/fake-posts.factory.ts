import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseFakeEntityFactory } from './base.factory';
import { Post } from '../../../../src/entities/post.entity';
import { faker } from '@faker-js/faker';

@Injectable()
export class FakePostsFactory extends BaseFakeEntityFactory<Post> {
  constructor(
    @InjectRepository(Post)
    public repository: Repository<Post>,
  ) {
    super(repository);
  }

  protected setFakeFields(): Partial<Post> {
    return {
      title: faker.word.noun(),
      content: faker.lorem.sentence(),
      isActive: true,
    };
  }
}
