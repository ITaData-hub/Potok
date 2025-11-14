import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { WebhookService } from './webhook.service';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { WebhookEvent } from './dto/webhook-subscription.dto';

describe('WebhookService', () => {
    let service: WebhookService;
    let httpService: HttpService;
    let subscriptionService: WebhookSubscriptionService;
  
    const mockHttpService = {
      post: jest.fn(),
    };
  
    // Определяем интерфейс с индексной сигнатурой
    interface ConfigMap {
      [key: string]: number | string;
    }
  
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: ConfigMap = {
          'webhook.deliveryTimeout': 30000,
          'webhook.maxRetries': 3,
          'webhook.retryDelay': 1000,
          'webhook.secretKey': 'test-secret',
        };
        return config[key];
      }),
    };

  const mockSubscriptionService = {
    findByEvent: jest.fn(),
    resetFailureCount: jest.fn(),
    incrementFailureCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WebhookSubscriptionService,
          useValue: mockSubscriptionService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    httpService = module.get<HttpService>(HttpService);
    subscriptionService = module.get<WebhookSubscriptionService>(WebhookSubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trigger', () => {
    it('should send webhook to all subscribed endpoints', async () => {
      const subscriptions = [
        {
          id: '1',
          url: 'http://example.com/webhook',
          events: [WebhookEvent.ENTITY_CREATED],
          active: true,
          failureCount: 0,
        },
      ];

      mockSubscriptionService.findByEvent.mockResolvedValue(subscriptions);
      mockHttpService.post.mockReturnValue(of({ status: 200, data: {} }));

      await service.trigger(WebhookEvent.ENTITY_CREATED, { test: 'data' });

      expect(mockSubscriptionService.findByEvent).toHaveBeenCalledWith(WebhookEvent.ENTITY_CREATED);
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
      expect(mockSubscriptionService.resetFailureCount).toHaveBeenCalledWith('1');
    });

    it('should retry on failure', async () => {
      const subscriptions = [
        {
          id: '1',
          url: 'http://example.com/webhook',
          events: [WebhookEvent.ENTITY_CREATED],
          active: true,
          failureCount: 0,
        },
      ];

      mockSubscriptionService.findByEvent.mockResolvedValue(subscriptions);
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(of({ status: 200, data: {} }));

      await service.trigger(WebhookEvent.ENTITY_CREATED, { test: 'data' });

      expect(mockHttpService.post).toHaveBeenCalledTimes(3);
      expect(mockSubscriptionService.resetFailureCount).toHaveBeenCalledWith('1');
    });

    it('should increment failure count after max retries', async () => {
      const subscriptions = [
        {
          id: '1',
          url: 'http://example.com/webhook',
          events: [WebhookEvent.ENTITY_CREATED],
          active: true,
          failureCount: 0,
        },
      ];

      mockSubscriptionService.findByEvent.mockResolvedValue(subscriptions);
      mockHttpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await service.trigger(WebhookEvent.ENTITY_CREATED, { test: 'data' });

      expect(mockHttpService.post).toHaveBeenCalledTimes(3);
      expect(mockSubscriptionService.incrementFailureCount).toHaveBeenCalledWith('1');
    });
  });

  describe('generateSignature', () => {
    it('should generate valid HMAC signature', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret';
      const signature = service.generateSignature(payload, secret);

      const isValid = service.verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret';
      const invalidSignature = 'invalid-signature';

      const isValid = service.verifySignature(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });
  });
});
