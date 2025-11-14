import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';

describe('Application E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('API Info', () => {
    it('GET /api/v1 should return API info', () => {
      return request(app.getHttpServer())
        .get('/api/v1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('environment');
        });
    });
  });

  describe('Webhook Subscriptions', () => {
    let subscriptionId: string;

    it('POST /webhooks/subscriptions should create subscription', () => {
      return request(app.getHttpServer())
        .post('/webhooks/subscriptions')
        .send({
          url: 'http://example.com/webhook',
          events: ['entity.created'],
          description: 'Test webhook',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('url');
          expect(res.body.active).toBe(true);
          subscriptionId = res.body.id;
        });
    });

    it('GET /webhooks/subscriptions should list subscriptions', () => {
      return request(app.getHttpServer())
        .get('/webhooks/subscriptions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('GET /webhooks/subscriptions/:id should get subscription', () => {
      return request(app.getHttpServer())
        .get(`/webhooks/subscriptions/${subscriptionId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(subscriptionId);
        });
    });

    it('DELETE /webhooks/subscriptions/:id should delete subscription', () => {
      return request(app.getHttpServer())
        .delete(`/webhooks/subscriptions/${subscriptionId}`)
        .expect(204);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent route', () => {
      return request(app.getHttpServer())
        .get('/non-existent-route')
        .expect(404);
    });

    it('should return 400 for invalid data', () => {
      return request(app.getHttpServer())
        .post('/webhooks/subscriptions')
        .send({
          url: 'invalid-url',
          events: [],
        })
        .expect(400);
    });
  });
});
