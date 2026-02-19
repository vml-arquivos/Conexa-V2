import { Test, TestingModule } from '@nestjs/testing';
import { DashboardCentralController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('DashboardCentralController', () => {
  let controller: DashboardCentralController;
  let service: DashboardsService;

  const mockDashboardsService = {
    getDashboardCentral: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockUserStaffCentral: JwtPayload = {
    sub: 'staff-001',
    email: 'bruna@central.com',
    mantenedoraId: 'mant-001',
    roles: [{ roleId: 'r1', level: 'STAFF_CENTRAL', unitScopes: ['unit-001', 'unit-002'] }],
  };

  const mockUserMantenedora: JwtPayload = {
    sub: 'mant-user-001',
    email: 'carla@mantenedora.com',
    mantenedoraId: 'mant-001',
    roles: [{ roleId: 'r2', level: 'MANTENEDORA', unitScopes: [] }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardCentralController],
      providers: [
        { provide: DashboardsService, useValue: mockDashboardsService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        Reflector,
      ],
    }).compile();

    controller = module.get<DashboardCentralController>(DashboardCentralController);
    service = module.get<DashboardsService>(DashboardsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  // ─── GET /dashboard/central ─────────────────────────────────────────────
  describe('getDashboardCentral()', () => {
    const mockDashboardData = {
      totalAlunos: 342,
      totalProfessores: 28,
      totalAlertas: 15,
      coberturaDiario: 87,
      evolucaoMensal: [
        { mes: 'Set', registros: 1820, presencas: 1675, alertas: 12 },
        { mes: 'Out', registros: 2100, presencas: 1932, alertas: 8 },
        { mes: 'Nov', registros: 1950, presencas: 1794, alertas: 18 },
        { mes: 'Dez', registros: 980, presencas: 902, alertas: 5 },
        { mes: 'Jan', registros: 2200, presencas: 2024, alertas: 11 },
        { mes: 'Fev', registros: 1640, presencas: 1509, alertas: 15 },
      ],
      comparativoUnidades: [
        { nome: 'Unidade Centro', alunos: 120, professores: 10, alertas: 5, cobertura: 91 },
        { nome: 'Unidade Norte', alunos: 98, professores: 8, alertas: 7, cobertura: 83 },
        { nome: 'Unidade Sul', alunos: 124, professores: 10, alertas: 3, cobertura: 95 },
      ],
      distribuicaoAlertas: [
        { tipo: 'Comportamental', quantidade: 6, cor: '#EF4444' },
        { tipo: 'Desenvolvimento', quantidade: 4, cor: '#F59E0B' },
        { tipo: 'Saúde', quantidade: 3, cor: '#8B5CF6' },
        { tipo: 'Alimentação', quantidade: 2, cor: '#06B6D4' },
      ],
    };

    it('deve retornar dados consolidados para STAFF_CENTRAL sem filtros', async () => {
      mockDashboardsService.getDashboardCentral.mockResolvedValue(mockDashboardData);

      const result = await controller.getDashboardCentral(
        undefined,
        undefined,
        mockUserStaffCentral,
      );

      expect(service.getDashboardCentral).toHaveBeenCalledWith(
        mockUserStaffCentral,
        undefined,
        undefined,
      );
      expect(result).toMatchObject({
        totalAlunos: 342,
        totalProfessores: 28,
        totalAlertas: 15,
        coberturaDiario: 87,
      });
      expect(result.evolucaoMensal).toHaveLength(6);
      expect(result.comparativoUnidades).toHaveLength(3);
      expect(result.distribuicaoAlertas).toHaveLength(4);
    });

    it('deve retornar dados filtrados por unidade para MANTENEDORA', async () => {
      const filteredData = {
        ...mockDashboardData,
        totalAlunos: 120,
        totalProfessores: 10,
        comparativoUnidades: [
          { nome: 'Unidade Centro', alunos: 120, professores: 10, alertas: 5, cobertura: 91 },
        ],
      };

      mockDashboardsService.getDashboardCentral.mockResolvedValue(filteredData);

      const result = await controller.getDashboardCentral(
        'unit-001',
        '30d',
        mockUserMantenedora,
      );

      expect(service.getDashboardCentral).toHaveBeenCalledWith(
        mockUserMantenedora,
        'unit-001',
        '30d',
      );
      expect(result.totalAlunos).toBe(120);
      expect(result.comparativoUnidades).toHaveLength(1);
    });

    it('deve retornar dados com período de 7 dias', async () => {
      mockDashboardsService.getDashboardCentral.mockResolvedValue({
        ...mockDashboardData,
        coberturaDiario: 94,
      });

      const result = await controller.getDashboardCentral(
        undefined,
        '7d',
        mockUserStaffCentral,
      );

      expect(service.getDashboardCentral).toHaveBeenCalledWith(
        mockUserStaffCentral,
        undefined,
        '7d',
      );
      expect(result.coberturaDiario).toBe(94);
    });

    it('deve retornar dados com período de 90 dias', async () => {
      mockDashboardsService.getDashboardCentral.mockResolvedValue(mockDashboardData);

      await controller.getDashboardCentral(undefined, '90d', mockUserStaffCentral);

      expect(service.getDashboardCentral).toHaveBeenCalledWith(
        mockUserStaffCentral,
        undefined,
        '90d',
      );
    });

    it('deve verificar estrutura da evolução mensal', async () => {
      mockDashboardsService.getDashboardCentral.mockResolvedValue(mockDashboardData);

      const result = await controller.getDashboardCentral(
        undefined,
        undefined,
        mockUserStaffCentral,
      );

      result.evolucaoMensal.forEach((mes: any) => {
        expect(mes).toHaveProperty('mes');
        expect(mes).toHaveProperty('registros');
        expect(mes).toHaveProperty('presencas');
        expect(mes).toHaveProperty('alertas');
        expect(typeof mes.registros).toBe('number');
        expect(typeof mes.presencas).toBe('number');
      });
    });

    it('deve verificar estrutura da distribuição de alertas', async () => {
      mockDashboardsService.getDashboardCentral.mockResolvedValue(mockDashboardData);

      const result = await controller.getDashboardCentral(
        undefined,
        undefined,
        mockUserStaffCentral,
      );

      result.distribuicaoAlertas.forEach((alerta: any) => {
        expect(alerta).toHaveProperty('tipo');
        expect(alerta).toHaveProperty('quantidade');
        expect(alerta).toHaveProperty('cor');
      });

      // Verificar que os tipos esperados estão presentes
      const tipos = result.distribuicaoAlertas.map((a: any) => a.tipo);
      expect(tipos).toContain('Comportamental');
      expect(tipos).toContain('Desenvolvimento');
    });
  });
});
