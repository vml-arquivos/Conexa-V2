import { AuditLogAction, RoleLevel } from '@prisma/client';
import { DashboardsService } from './dashboards.service';

describe('DashboardsService', () => {
  const prisma = {
    userRoleUnitScope: {
      findMany: jest.fn(),
    },
    classroom: {
      findMany: jest.fn(),
    },
  } as any;

  const audit = {
    log: jest.fn(),
  } as any;

  let service: DashboardsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardsService(prisma, audit);
  });

  it('deve permitir STAFF_CENTRAL sem classroomId usando unitId agregado', async () => {
    prisma.userRoleUnitScope.findMany.mockResolvedValue([
      { unitId: 'unit-arara-can' },
    ]);
    prisma.classroom.findMany.mockResolvedValue([]);

    const result = await service.getTeacherDashboard(
      {
        sub: 'staff-central-1',
        email: 'bruna@example.com',
        roles: [
          {
            roleId: 'role-staff',
            level: RoleLevel.STAFF_CENTRAL,
            type: 'STAFF_CENTRAL_PEDAGOGICO' as any,
            unitScopes: [],
          },
        ],
      } as any,
      '2026-02-19',
      undefined,
      'unit-arara-can',
    );

    expect(prisma.userRoleUnitScope.findMany).toHaveBeenCalled();
    expect(prisma.classroom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          unitId: 'unit-arara-can',
          isActive: true,
        },
      }),
    );
    expect(audit.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditLogAction.VIEW }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        date: '2026-02-19',
        classrooms: [],
      }),
    );
  });
});
