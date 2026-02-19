import { Test, TestingModule } from '@nestjs/testing';
import { ClassroomsController } from './classrooms.controller';
import { LookupService } from '../lookup/lookup.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('ClassroomsController', () => {
  let controller: ClassroomsController;
  let lookupService: LookupService;

  const mockLookupService = {
    getChildrenByClassroom: jest.fn(),
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
      controllers: [ClassroomsController],
      providers: [
        { provide: LookupService, useValue: mockLookupService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClassroomsController>(ClassroomsController);
    lookupService = module.get<LookupService>(LookupService);
  });

  afterEach(() => jest.clearAllMocks());

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
    expect(lookupService).toBeDefined();
  });

  // ─── GET /classrooms/:id/children ───────────────────────────────────────
  describe('getChildrenByClassroom()', () => {
    it('deve retornar lista de crianças de uma turma', async () => {
      mockLookupService.getChildrenByClassroom.mockResolvedValue(mockChildren);

      const result = await controller.getChildrenByClassroom('class-001', mockUserProfessor);

      expect(lookupService.getChildrenByClassroom).toHaveBeenCalledWith(
        'class-001',
        mockUserProfessor,
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ id: 'child-001', name: 'Ana Lima', firstName: 'Ana' });
      expect(result[1]).toMatchObject({ id: 'child-002', name: 'Bruno Santos' });
      expect(result[2]).toMatchObject({ id: 'child-003', name: 'Carla Oliveira' });
    });

    it('deve retornar lista vazia para turma sem alunos', async () => {
      mockLookupService.getChildrenByClassroom.mockResolvedValue([]);

      const result = await controller.getChildrenByClassroom('class-empty', mockUserProfessor);

      expect(result).toEqual([]);
    });

    it('deve propagar ForbiddenException quando professor não tem acesso à turma', async () => {
      mockLookupService.getChildrenByClassroom.mockRejectedValue(
        new ForbiddenException('Sem acesso a esta turma'),
      );

      await expect(
        controller.getChildrenByClassroom('class-outro', mockUserProfessor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve retornar crianças para usuário UNIDADE', async () => {
      mockLookupService.getChildrenByClassroom.mockResolvedValue(mockChildren);

      const result = await controller.getChildrenByClassroom('class-001', mockUserUnidade);

      expect(result).toHaveLength(3);
      result.forEach((child: any) => {
        expect(child).toHaveProperty('id');
        expect(child).toHaveProperty('name');
        expect(child).toHaveProperty('classroomId');
      });
    });

    it('deve propagar ForbiddenException quando turma não pertence à mantenedora', async () => {
      mockLookupService.getChildrenByClassroom.mockRejectedValue(
        new ForbiddenException('Turma não encontrada ou sem acesso'),
      );

      await expect(
        controller.getChildrenByClassroom('class-outra-mantenedora', mockUserProfessor),
      ).rejects.toThrow('Turma não encontrada ou sem acesso');
    });
  });
});
