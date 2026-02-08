import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  // Mock fixo para evitar flutuação por timestamp/uptime
  const mockHealthResponse = {
    status: 'ok',
    timestamp: '2026-02-07T20:00:00.000Z',
    uptime: 12345.678,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn().mockReturnValue(mockHealthResponse),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check()', () => {
    it('should return health status from service', () => {
      const result = controller.check();

      expect(result).toEqual(mockHealthResponse);
      expect(healthService.check).toHaveBeenCalledTimes(1);
    });

    it('should return object with status, timestamp, and uptime', () => {
      const result = controller.check();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result.status).toBe('ok');
    });
  });
});
