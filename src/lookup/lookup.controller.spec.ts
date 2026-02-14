import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { LookupController } from './lookup.controller';
import { LookupService } from './lookup.service';

describe('LookupController', () => {
  let controller: LookupController;
  let service: LookupService;

  const mockLookupService = {
    getAccessibleUnits: jest.fn(),
    getAccessibleClassrooms: jest.fn(),
    getAccessibleTeachers: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LookupController],
      providers: [
        {
          provide: LookupService,
          useValue: mockLookupService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<LookupController>(LookupController);
    service = module.get<LookupService>(LookupService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getAccessibleUnits', () => {
    it('should call service.getAccessibleUnits with user data', async () => {
      const mockUser = {
        userId: 'user-1',
        mantenedoraId: 'mant-1',
        unitId: 'unit-1',
        roleLevel: 'UNIDADE',
      };

      mockLookupService.getAccessibleUnits.mockResolvedValue([
        { id: 'unit-1', code: 'U001', name: 'Unidade 1' },
      ]);

      const result = await controller.getAccessibleUnits(mockUser);

      expect(service.getAccessibleUnits).toHaveBeenCalledWith(
        'mant-1',
        'unit-1',
        'UNIDADE',
      );
      expect(result).toEqual([{ id: 'unit-1', code: 'U001', name: 'Unidade 1' }]);
    });
  });

  describe('getAccessibleClassrooms', () => {
    it('should call service.getAccessibleClassrooms with user and unitId', async () => {
      const mockUser = {
        userId: 'user-1',
        mantenedoraId: 'mant-1',
        unitId: 'unit-1',
        roleLevel: 'PROFESSOR',
      };

      mockLookupService.getAccessibleClassrooms.mockResolvedValue([
        { id: 'class-1', code: 'C001', name: 'Turma 1', unitId: 'unit-1' },
      ]);

      const result = await controller.getAccessibleClassrooms(mockUser, 'unit-1');

      expect(service.getAccessibleClassrooms).toHaveBeenCalledWith(
        'unit-1',
        'user-1',
        'PROFESSOR',
      );
      expect(result).toEqual([
        { id: 'class-1', code: 'C001', name: 'Turma 1', unitId: 'unit-1' },
      ]);
    });
  });

  describe('getAccessibleTeachers', () => {
    it('should call service.getAccessibleTeachers with unitId', async () => {
      mockLookupService.getAccessibleTeachers.mockResolvedValue([
        { id: 'teacher-1', name: 'Prof. João', email: 'joao@example.com', unitId: 'unit-1' },
      ]);

      const result = await controller.getAccessibleTeachers('unit-1');

      expect(service.getAccessibleTeachers).toHaveBeenCalledWith('unit-1');
      expect(result).toEqual([
        { id: 'teacher-1', name: 'Prof. João', email: 'joao@example.com', unitId: 'unit-1' },
      ]);
    });
  });
});
