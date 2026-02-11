import { Test, TestingModule } from '@nestjs/testing';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('DashboardsController', () => {
  let controller: DashboardsController;
  let service: DashboardsService;

  const mockDashboardsService = {
    getUnitDashboard: jest.fn(),
    getTeacherDashboard: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardsController],
      providers: [
        {
          provide: DashboardsService,
          useValue: mockDashboardsService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<DashboardsController>(DashboardsController);
    service = module.get<DashboardsService>(DashboardsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUnitDashboard', () => {
    it('should call service.getUnitDashboard with correct params', async () => {
      const mockUser = {
        sub: 'user-id',
        email: 'test@example.com',
        roles: [{ level: 'UNIDADE' }],
        unitId: 'unit-id',
      } as any;

      const mockResult = {
        unitId: 'unit-id',
        period: { from: '2026-02-01', to: '2026-02-10' },
        kpis: {
          diaryCreatedTotal: 100,
          unplannedCount: 10,
          planningsDraftOrPending: 5,
          classroomsCount: 8,
          activeChildrenCount: 150,
        },
      };

      mockDashboardsService.getUnitDashboard.mockResolvedValue(mockResult);

      const result = await controller.getUnitDashboard(
        'unit-id',
        '2026-02-01',
        '2026-02-10',
        mockUser,
      );

      expect(service.getUnitDashboard).toHaveBeenCalledWith(
        mockUser,
        'unit-id',
        '2026-02-01',
        '2026-02-10',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getTeacherDashboard', () => {
    it('should call service.getTeacherDashboard with correct params', async () => {
      const mockUser = {
        sub: 'teacher-id',
        email: 'teacher@example.com',
        roles: [{ level: 'PROFESSOR' }],
      } as any;

      const mockResult = {
        date: '2026-02-10',
        classrooms: [
          {
            classroomId: 'classroom-1',
            classroomName: 'Maternal I',
            totalDiaryEvents: 20,
            unplannedEvents: 2,
            microGesturesFilled: 15,
            activePlanningStatus: 'ACTIVE',
          },
        ],
      };

      mockDashboardsService.getTeacherDashboard.mockResolvedValue(mockResult);

      const result = await controller.getTeacherDashboard(
        '2026-02-10',
        'classroom-1',
        mockUser,
      );

      expect(service.getTeacherDashboard).toHaveBeenCalledWith(
        mockUser,
        '2026-02-10',
        'classroom-1',
      );
      expect(result).toEqual(mockResult);
    });
  });
});
