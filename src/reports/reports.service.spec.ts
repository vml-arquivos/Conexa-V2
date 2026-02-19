import { RoleLevel } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const prisma = {
    classroom: { findUnique: jest.fn() },
    classroomTeacher: { findFirst: jest.fn() },
    diaryEvent: { findMany: jest.fn() },
    userRoleUnitScope: { findMany: jest.fn() },
  } as any;

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(prisma);
  });

  it('deve enriquecer eventos com campos legíveis no relatório por período', async () => {
    prisma.diaryEvent.findMany.mockResolvedValue([
      {
        id: 'evt-1',
        unit: { id: 'u1', name: 'Arara-Canindé' },
        classroom: { id: 'c1', name: 'Maternal I' },
        child: { id: 'ch1', firstName: 'Ana', lastName: 'Silva' },
        createdByUser: { id: 't1', firstName: 'João', lastName: 'Souza' },
      },
    ]);

    const result = await service.getDiaryByPeriod(
      '2026-02-01',
      '2026-02-10',
      {
        sub: 'dev-1',
        email: 'dev@example.com',
        roles: [{ level: RoleLevel.DEVELOPER }],
      } as any,
    );

    expect(result.events[0]).toEqual(
      expect.objectContaining({
        unitName: 'Arara-Canindé',
        classroomName: 'Maternal I',
        childName: 'Ana Silva',
        teacherName: 'João Souza',
      }),
    );
  });

  it('deve filtrar STAFF_CENTRAL por unitScopes no relatório sem planejamento', async () => {
    prisma.userRoleUnitScope.findMany.mockResolvedValue([{ unitId: 'u1' }]);
    prisma.diaryEvent.findMany.mockResolvedValue([]);

    await service.getUnplannedDiaryEvents(
      {
        sub: 'staff-1',
        email: 'staff@example.com',
        roles: [{ level: RoleLevel.STAFF_CENTRAL }],
      } as any,
    );

    expect(prisma.diaryEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          unitId: { in: ['u1'] },
        }),
      }),
    );
  });
});
