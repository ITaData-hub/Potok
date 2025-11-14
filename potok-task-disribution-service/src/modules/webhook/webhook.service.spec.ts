import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { WebhookService } from './webhook.service';
import { of } from 'rxjs';

describe('WebhookService', () => {
  let service: WebhookService;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        WEBHOOK_URL: 'http://localhost:5000/webhooks',
        WEBHOOK_SECRET: 'test-secret',
      };
      return config[key];
    }),
  };

  const mockHttpService = {
    post: jest.fn(() => of({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendWebhook', () => {
    it('should send webhook successfully', async () => {
      const payload = {
        eventType: 'test.event' as any,
        userId: 'user123',
        timestamp: new Date(),
        correlationId: 'test-correlation-id',
        data: { test: 'data' },
      };

      await service.sendWebhook(payload);
      
      expect(httpService.post).toHaveBeenCalled();
    });
  });
});
