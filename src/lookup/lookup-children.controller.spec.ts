/**
 * Testes para os novos endpoints de children no LookupController
 * GET /lookup/children/accessible
 * GET /lookup/classrooms/:id/children
 */
import { Test, TestingModule } from '@nestjs/testing';
import { LookupController } from './lookup.controller';
import { LookupService } from './lookup.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('LookupController — endpoints de children', () => {
  let controller: LookupController;
  let service: LookupService;

  const mockLookupService = {
    getAccessibleUnits: jest.fn(),
    getAccessibleClassrooms: jest.fn(),
    getAccessibleTeachers: jest.fn(),
    getAccessibleChildren: jest.fn(),
    getChildrenByClassroom: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockUserProfessor: JwtPayload = {
    sub: 'prof-001',
    email: 'professora@escola.com',
    mantenedoraId: 'mant-001',
    unitId: 'unit-001',
    roles: [{ roleId: 'r1', level: 'PROFESSOR', unitScopes: [] }],
  };

  const mockUserUnidade: JwtPayload = {
    sub: 'coord-001',
    email: 'coordenadora@escola.com',
    mantenedoraId: 'mant-001',
    unitId: 'unit-001',
    roles: [{ roleId: 'r2', level: 'UNIDADE', unitScopes: [] }],
  };

  const mockChildren = [
    { id: 'child-001', firstName: 'Ana', lastName: 'Lima', name: 'Ana Lima', classroomId: 'class-001' },
    { id: 'child-002', firstName: 'Bruno', lastName: 'Santos', name: 'Bruno Santos', classroomId: 'class-001' },
    { id: 'child-003', firstName: 'Carla', lastName: 'Oliveira', name: 'Carla Oliveira', classroomId: 'class-001' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LookupController],
      providers: [
        { provide: LookupService, useValue: mockLookupService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        Reflector,
      ],
    }).compile();

    controller = module.get<LookupController>(LookupController);
    service = module.get<LookupService>(LookupService);
  });

  afterEach(() => jest.clearAllMocks());

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  // ─── GET /lookup/children/accessible ────────────────────────────────────
  describe('getAccessibleChildren()', () => {
    it('deve retornar crianças da turma para professor com acesso', async () => {
      mockLookupService.getAccessibleChildren.mockResolvedValue(mockChildren);

      const result = await controller.getAccessibleChildren(mockUserProfessor, 'class-001');

      expect(service.getAccessibleChildren).toHaveBeenCalledWith(mockUserProfessor, 'class-001');
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ id: 'child-001', name: 'Ana Lima', firstName: 'Ana' });
      expect(result[1]).toMatchObject({ id: 'child-002', name: 'Bruno Santos' });
      expect(result[2]).toMatchObject({ id: 'child-003', name: 'Carla Oliveira' });
    });

    it('deve retornar lista vazia quando classroomId não é fornecido', async () => {
      mockLookupService.getAccessibleChildren.mockResolvedValue([]);

      const result = await controller.getAccessibleChildren(mockUserProfessor, undefined);

      expect(service.getAccessibleChildren).toHaveBeenCalledWith(mockUserProfessor, undefined);
      expect(result).toEqual([]);
    });

    it('deve retornar crianças para usuário UNIDADE', async () => {
      mockLookupService.getAccessibleChildren.mockResolvedValue(mockChildren);

      const result = await controller.getAccessibleChildren(mockUserUnidade, 'class-001');

      expect(result).toHaveLength(3);
      // Verificar que os campos essenciais estão presentes
      result.forEach((child: any) => {
        expect(child).toHaveProperty('id');
        expect(child).toHaveProperty('name');
        expect(child).toHaveProperty('firstName');
        expect(child).toHaveProperty('lastName');
        expect(child).toHaveProperty('classroomId');
      });
    });

    it('deve lançar ForbiddenException quando professor não tem acesso à turma', async () => {
      mockLookupService.getAccessibleChildren.mockRejectedValue(
        new ForbiddenException('Você não tem acesso a esta turma'),
      );

      await expect(
        controller.getAccessibleChildren(mockUserProfessor, 'class-outro'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException quando turma não pertence à mantenedora', async () => {
      mockLookupService.getAccessibleChildren.mockRejectedValue(
        new ForbiddenException('Turma não encontrada ou sem acesso'),
      );

      await expect(
        controller.getAccessibleChildren(mockUserProfessor, 'class-outra-mantenedora'),
      ).rejects.toThrow('Turma não encontrada ou sem acesso');
    });
  });

  // ─── GET /lookup/classrooms/:id/children ────────────────────────────────
  describe('getChildrenByClassroom()', () => {
    it('deve retornar crianças via endpoint alternativo', async () => {
      mockLookupService.getChildrenByClassroom.mockResolvedValue(mockChildren);

      const result = await controller.getChildrenByClassroom('class-001', mockUserProfessor);

      expect(service.getChildrenByClassroom).toHaveBeenCalledWith('class-001', mockUserProfessor);
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockChildren);
    });

    it('deve retornar lista vazia para turma sem matrículas ativas', async () => {
      mockLookupService.getChildrenByClassroom.mockResolvedValue([]);

      const result = await controller.getChildrenByClassroom('class-vazia', mockUserUnidade);

      expect(result).toEqual([]);
    });
  });
});
