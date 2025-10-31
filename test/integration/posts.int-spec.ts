import { INestApplication, ValidationPipe } from '@nestjs/common';
import { appWithFakeFactoriesBuilder } from '../app-factories/app-with-fake-factories.factory';
import { FakePostsFactory } from '../fixtures/fake-entities/entity-factories/fake-posts.factory';
import { BaseFakeEntityFactory } from '../fixtures/fake-entities/entity-factories/base.factory';
import { Post } from '../../src/entities/post.entity';
import { PostsService } from '../../src/modules/posts/posts.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let postsService: PostsService;
  let ffPosts: BaseFakeEntityFactory<Post>;
  beforeAll(async () => {
    ({app, factories: [ffPosts]} = await appWithFakeFactoriesBuilder([FakePostsFactory]));
    await app.init();
    postsService = app.get(PostsService);
    await ffPosts.deleteAll();
  });
  
  afterAll(async () => {
    await ffPosts.cleanup();
    await app.close();
  })

  it('tests fake Posts factory', async () => {
    await ffPosts.create({title: 'testCustom'})
    
    const posts = await postsService.findAll()
    expect(posts).toEqual([expect.objectContaining({
      id: expect.any(Number),
      title: 'testCustom',
      content: expect.any(String),
    })]);
  });
});
