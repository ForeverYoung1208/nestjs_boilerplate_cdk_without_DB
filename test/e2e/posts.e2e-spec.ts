import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { appBuilder } from '../app-factories/default-app.factory';
import { PostsService } from '../../src/modules/posts/posts.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let postsService: PostsService;
  beforeAll(async () => {
    app = await appBuilder();
    await app.init();
    postsService = app.get(PostsService);
  });
  afterAll(async () => {
    await app.close();
  });

  it('(POST) /posts ', async () => {
    const res = await request(app.getHttpServer())
      .post('/posts')
      .send({
        title: 'test',
        content: 'test',
      })
      .expect(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      title: 'test',
      content: 'test',
    });
    await postsService.delete(res.body.id);
  });
});
