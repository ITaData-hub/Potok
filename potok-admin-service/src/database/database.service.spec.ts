// src/database/database.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { DataSource } from 'typeorm';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
            getRepository: jest.fn(),
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute query', async () => {
    const mockResult = [{ id: 1, name: 'test' }];
    jest.spyOn(dataSource, 'query').mockResolvedValue(mockResult);

    const result = await service.executeQuery('SELECT * FROM users');
    expect(result).toEqual(mockResult);
  });

  it('should check connection', async () => {
    jest.spyOn(dataSource, 'query').mockResolvedValue([{ result: 1 }]);
    
    const isConnected = await service.checkConnection();
    expect(isConnected).toBe(true);
  });
});
