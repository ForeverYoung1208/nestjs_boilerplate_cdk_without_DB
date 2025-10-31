import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { appBuilder } from '../app-factories/default-app.factory';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await appBuilder();
    await app.init();
  });
  
  afterAll(async () => {
    await app.close();
  })

  it('/ (GET)', async () => {
    return await request(app.getHttpServer()).get('/').expect(200).expect('OK');
  });
});
