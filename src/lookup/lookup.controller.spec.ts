import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { LookupController } from './lookup.controller';
import { LookupService } from './lookup.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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
    it('should call service.getAccessibleUnits with full user payload', async () => {
      const mockUser: JwtPayload = {
        sub: 'user-1',
        email: 'user@example.com',
        mantenedoraId: 'mant-1',
        unitId: 'unit-1',
        roles: [
          {
            roleId: 'role-1',
            level: 'UNIDADE',
            unitScopes: [],
          },
        ],
      };

      mockLookupService.getAccessibleUnits.mockResolvedValue([
        { id: 'unit-1', code: 'U001', name: 'Unidade 1' },
      ]);

      const result = await controller.getAccessibleUnits(mockUser);

      expect(service.getAccessibleUnits).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([{ id: 'unit-1', code: 'U001', name: 'Unidade 1' }]);
    });

    it('should handle STAFF_CENTRAL with unitScopes', async () => {
      const mockUser: JwtPayload = {
        sub: 'user-2',
        email: 'staff@example.com',
        mantenedoraId: 'mant-1',
        roles: [
          {
            roleId: 'role-2',
            level: 'STAFF_CENTRAL',
            unitScopes: ['unit-1', 'unit-2', 'unit-3'],
          },
        ],
      };

      mockLookupService.getAccessibleUnits.mockResolvedValue([
        { id: 'unit-1', code: 'U001', name: 'Unidade 1' },
        { id: 'unit-2', code: 'U002', name: 'Unidade 2' },
        { id: 'unit-3', code: 'U003', name: 'Unidade 3' },
      ]);

      const result = await controller.getAccessibleUnits(mockUser);

      expect(service.getAccessibleUnits).toHaveBeenCalledWith(mockUser);
      expect(result).toHaveLength(3);
    });
  });

  describe('getAccessibleClassrooms', () => {
    it('should call service.getAccessibleClassrooms with user and unitId', async () => {
      const mockUser: JwtPayload = {
        sub: 'user-1',
        email: 'professor@example.com',
        mantenedoraId: 'mant-1',
        unitId: 'unit-1',
        roles: [
          {
            roleId: 'role-1',
            level: 'PROFESSOR',
            unitScopes: [],
          },
        ],
      };

      mockLookupService.getAccessibleClassrooms.mockResolvedValue([
        { id: 'class-1', code: 'C001', name: 'Turma 1', unitId: 'unit-1' },
      ]);

      const result = await controller.getAccessibleClassrooms(mockUser, 'unit-1');

      expect(service.getAccessibleClassrooms).toHaveBeenCalledWith(mockUser, 'unit-1');
      expect(result).toEqual([
        { id: 'class-1', code: 'C001', name: 'Turma 1', unitId: 'unit-1' },
      ]);
    });

    it('should handle STAFF_CENTRAL with unitScopes', async () => {
      const mockUser: JwtPayload = {
        sub: 'user-2',
        email: 'staff@example.com',
        mantenedoraId: 'mant-1',
        roles: [
          {
            roleId: 'role-2',
            level: 'STAFF_CENTRAL',
            unitScopes: ['unit-1', 'unit-2'],
          },
        ],
      };

      mockLookupService.getAccessibleClassrooms.mockResolvedValue([
        { id: 'class-1', code: 'C001', name: 'Turma 1', unitId: 'unit-1' },
        { id: 'class-2', code: 'C002', name: 'Turma 2', unitId: 'unit-1' },
      ]);

      const result = await controller.getAccessibleClassrooms(mockUser, 'unit-1');

      expect(service.getAccessibleClassrooms).toHaveBeenCalledWith(mockUser, 'unit-1');
      expect(result).toHaveLength(2);
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
