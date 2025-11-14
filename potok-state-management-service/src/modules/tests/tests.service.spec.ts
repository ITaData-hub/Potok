import { Test, TestingModule } from '@nestjs/testing';
import { TestsService } from './tests.service';
import { ExternalDatabaseService } from '../database/external-database.service';
import { RedisService } from '../redis/redis.service';
import { StateCalculatorService } from '../state/services/state-calculator.service';
import { CircadianService } from '../state/services/circadian.service';
import { WebhookService } from '../webhook/webhook.service';
import { TestType } from '../../common/enums/test-type.enum';

describe('TestsService', () => {
  let service: TestsService;
  let redisService: RedisService;
  let stateCalculator: StateCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestsService,
        {
          provide: ExternalDatabaseService,
          useValue: {
            saveUserState: jest.fn(),
            getUserStateHistory: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            generateKey: jest.fn().mockReturnValue('test:key'),
          },
        },
        {
          provide: StateCalculatorService,
          useValue: {
            calculateScore: jest.fn().mockReturnValue(8.5),
            normalizeScore: jest.fn().mockReturnValue(85),
            interpretScore: jest.fn().mockReturnValue('Пиковая энергия'),
            determineUIMode: jest.fn().mockReturnValue('PEAK'),
            calculateTrend: jest.fn().mockReturnValue(0.5),
          },
        },
        {
          provide: CircadianService,
          useValue: {
            calculateCircadianFactor: jest.fn().mockReturnValue(1.2),
            isInTestWindow: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: WebhookService,
          useValue: {
            sendTestCompleted: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TestsService>(TestsService);
    redisService = module.get<RedisService>(RedisService);
    stateCalculator = module.get<StateCalculatorService>(StateCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTestStructure', () => {
    it('should return energy test structure', async () => {
      const result = await service.getTestStructure(TestType.ENERGY);
      expect(result).toBeDefined();
      expect(result.test_type).toBe('energy');
      expect(result.questions).toHaveLength(3);
    });

    it('should throw error for unknown test type', async () => {
      await expect(
        service.getTestStructure('unknown' as TestType),
      ).rejects.toThrow();
    });
  });

  describe('submitTest', () => {
    it('should process test submission successfully', async () => {
      const userId = 'user123';
      const dto = {
        test_type: TestType.ENERGY,
        answers: [3, 2, 3],
        timestamp: new Date().toISOString(),
      };

      jest.spyOn(redisService, 'get').mockResolvedValue({
        user_id: userId,
        state: { energy: 70, focus: 60, motivation: 65, stress: 40 },
        trends: {
          energy_trend: 0.2,
          focus_trend: 0.1,
          motivation_trend: 0,
          stress_trend: -0.1,
        },
        circadian_factor: 1.0,
        day_of_week_factor: 1.0,
        ui_mode: 'NORMAL',
        last_test_times: {},
        timestamp: new Date(),
      });

      const result = await service.submitTest(userId, dto);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.test_type).toBe(TestType.ENERGY);
      expect(result.score).toBe(85);
    });
  });
});
