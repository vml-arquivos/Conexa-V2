import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LookupService } from '../lookup/lookup.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('classrooms')
@UseGuards(JwtAuthGuard)
export class ClassroomsController {
  constructor(private readonly lookupService: LookupService) {}

  /**
   * GET /classrooms/:id/children
   * Retorna crianças matriculadas em uma turma específica
   * Compatibilidade com o TeacherDashboardPage
   */
  @Get(':id/children')
  async getChildrenByClassroom(
    @Param('id') classroomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lookupService.getChildrenByClassroom(classroomId, user);
  }
}
