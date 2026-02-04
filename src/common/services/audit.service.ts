import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma ação no log de auditoria
   */
  async log(params: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    userId: string;
    mantenedoraId: string;
    unitId?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          userId: params.userId,
          mantenedoraId: params.mantenedoraId,
          unitId: params.unitId,
          changes: params.changes || {},
          metadata: params.metadata || {},
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
    entityType: string,
    entityId: string,
    userId: string,
    mantenedoraId: string,
    unitId?: string,
    data?: any,
  ) {
    return this.log({
      action: AuditAction.CREATE,
      entityType,
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
    entityType: string,
    entityId: string,
    userId: string,
    mantenedoraId: string,
    unitId?: string,
    oldData?: any,
    newData?: any,
  ) {
    return this.log({
      action: AuditAction.UPDATE,
      entityType,
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
    entityType: string,
    entityId: string,
    userId: string,
    mantenedoraId: string,
    unitId?: string,
    data?: any,
  ) {
    return this.log({
      action: AuditAction.DELETE,
      entityType,
      entityId,
      userId,
      mantenedoraId,
      unitId,
      changes: { deleted: data },
    });
  }
}
