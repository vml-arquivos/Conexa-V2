import { RoleLevel } from '@prisma/client';
import { canAccessUnit } from './can-access-unit';

describe('canAccessUnit', () => {
  it('deve permitir STAFF_CENTRAL via unitScopes no token', async () => {
    const result = await canAccessUnit(
      {
        sub: 'user-1',
        email: 'staff@example.com',
        roles: [
          {
            roleId: 'role-1',
            level: RoleLevel.STAFF_CENTRAL,
            type: 'STAFF_CENTRAL_PEDAGOGICO' as any,
            unitScopes: ['unit-arara-can'],
          },
        ],
      } as any,
      'unit-arara-can',
    );

    expect(result).toBe(true);
  });

  it('deve usar fallback do banco quando token não tiver unitScopes', async () => {
    const loadUnitScopes = jest
      .fn()
      .mockResolvedValue(['unit-arara-can', 'unit-outra']);

    const result = await canAccessUnit(
      {
        sub: 'user-2',
        email: 'staff2@example.com',
        roles: [
          {
            roleId: 'role-2',
            level: RoleLevel.STAFF_CENTRAL,
            type: 'STAFF_CENTRAL_PEDAGOGICO' as any,
            unitScopes: [],
          },
        ],
      } as any,
      'unit-arara-can',
      loadUnitScopes,
    );

    expect(loadUnitScopes).toHaveBeenCalledWith({ userId: 'user-2' });
    expect(result).toBe(true);
  });

  it('deve negar STAFF_CENTRAL sem escopo no token e sem fallback', async () => {
    const result = await canAccessUnit(
      {
        sub: 'user-3',
        email: 'staff3@example.com',
        roles: [
          {
            roleId: 'role-3',
            level: RoleLevel.STAFF_CENTRAL,
            type: 'STAFF_CENTRAL_PEDAGOGICO' as any,
            unitScopes: [],
          },
        ],
      } as any,
      'unit-arara-can',
    );

    expect(result).toBe(false);
  });
});
