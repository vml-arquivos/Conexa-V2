import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogAction, AuditLogEntity } from '@prisma/client';

@Injectable()
export class AuditDashboardAccessInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req?.user; // JwtAuthGuard popula

    const path = req?.route?.path ?? req?.path ?? 'unknown';
    const method = req?.method ?? 'GET';

    return next.handle().pipe(
      tap(async () => {
        // best-effort (não quebrar request se auditoria falhar)
        try {
          if (!user?.sub) return;

          await this.prisma.auditLog.create({
            data: {
              entity: AuditLogEntity.DIARY_EVENT, // fallback seguro para analytics
              action: AuditLogAction.VIEW,
              entityId: path,
              userId: user.sub,
              mantenedoraId: user.mantenedoraId ?? null,
              unitId: user.unitId ?? null,
              metadata: {
                method,
                path,
                query: req?.query ?? {},
              },
            } as any,
          });
        } catch {
          // no-op
        }
      }),
    );
  }
}
