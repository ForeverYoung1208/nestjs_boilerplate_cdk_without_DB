import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { appBuilder } from '../app-factories/default-app.factory';
import { PostsService } from '../../src/modules/posts/posts.service';
import { ConfigService } from '@nestjs/config';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let postsService: PostsService;
  let apiKey: string;
  beforeAll(async () => {
    app = await appBuilder();
    await app.init();
    postsService = app.get(PostsService);
    const configService = app.get(ConfigService);
    apiKey = configService.get('API_KEY');
  });
  afterAll(async () => {
    await app.close();
  });

  it('(POST) /posts ', async () => {
    const res = await request(app.getHttpServer())
      .post('/posts')
      .set('x-api-key', apiKey)
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
