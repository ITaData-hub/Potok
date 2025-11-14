import { Test, TestingModule } from '@nestjs/testing';
import { StateCalculatorService } from './state-calculator.service';
import { TestType } from '../../../common/enums/test-type.enum';
import { UIMode } from '../../../common/enums/ui-mode.enum';

describe('StateCalculatorService', () => {
  let service: StateCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StateCalculatorService],
    }).compile();

    service = module.get<StateCalculatorService>(StateCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateEnergyScore', () => {
    it('should calculate energy score correctly', () => {
      const answers = [3, 3, 3]; // Perfect score
      const result = service.calculateEnergyScore(answers);
      expect(result).toBeCloseTo(10, 0);
    });

    it('should calculate low energy score', () => {
      const answers = [1, 1, 1]; // Minimum score
      const result = service.calculateEnergyScore(answers);
      expect(result).toBeCloseTo(3.3, 1);
    });
  });

  describe('determineUIMode', () => {
    it('should return PEAK for high energy and focus', () => {
      const state = { energy: 85, focus: 85, motivation: 70, stress: 30 };
      const result = service.determineUIMode(state);
      expect(result).toBe(UIMode.PEAK);
    });

    it('should return CRITICAL for high stress', () => {
      const state = { energy: 50, focus: 50, motivation: 50, stress: 75 };
      const result = service.determineUIMode(state);
      expect(result).toBe(UIMode.CRITICAL);
    });

    it('should return LOW for low energy', () => {
      const state = { energy: 35, focus: 50, motivation: 50, stress: 40 };
      const result = service.determineUIMode(state);
      expect(result).toBe(UIMode.LOW);
    });

    it('should return NORMAL for balanced state', () => {
      const state = { energy: 60, focus: 65, motivation: 60, stress: 45 };
      const result = service.determineUIMode(state);
      expect(result).toBe(UIMode.NORMAL);
    });
  });

  describe('normalizeScore', () => {
    it('should normalize energy score to 0-100', () => {
      const result = service.normalizeScore(TestType.ENERGY, 8.5);
      expect(result).toBe(85);
    });

    it('should normalize focus score (already 0-100)', () => {
      const result = service.normalizeScore(TestType.FOCUS, 75);
      expect(result).toBe(75);
    });
  });
});
