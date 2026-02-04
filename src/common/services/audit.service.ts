import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma ação no log de auditoria
   */
  async log(params: {
    action: AuditLogAction;
    entity: any;
    entityId: string;
    userId: string;
    mantenedoraId: string;
    unitId?: string;
    changes?: Record<string, any>;
    description?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          userId: params.userId,
          mantenedoraId: params.mantenedoraId,
          unitId: params.unitId,
          changes: params.changes,
          description: params.description,
        },
      });
    } catch (error) {
      // Log de auditoria não deve quebrar a aplicação
      console.error('Erro ao registrar auditoria:', error);
    }
  }

  /**
   * Registra criação de entidade
   */
  async logCreate(
    entity: any,
    entityId: string,
    userId: string,
    mantenedoraId: string,
    unitId?: string,
    data?: any,
  ) {
    return this.log({
      action: AuditLogAction.CREATE,
      entity,
      entityId,
      userId,
      mantenedoraId,
      unitId,
      changes: { created: data },
    });
  }

  /**
   * Registra atualização de entidade
   */
  async logUpdate(
    entity: any,
    entityId: string,
    userId: string,
    mantenedoraId: string,
    unitId?: string,
    oldData?: any,
    newData?: any,
  ) {
    return this.log({
      action: AuditLogAction.UPDATE,
      entity,
      entityId,
      userId,
      mantenedoraId,
      unitId,
      changes: { old: oldData, new: newData },
    });
  }

  /**
   * Registra deleção de entidade
   */
  async logDelete(
    entity: any,
    entityId: string,
    userId: string,
    mantenedoraId: string,
    unitId?: string,
    data?: any,
  ) {
    return this.log({
      action: AuditLogAction.DELETE,
      entity,
      entityId,
      userId,
      mantenedoraId,
      unitId,
      changes: { deleted: data },
    });
  }
}
