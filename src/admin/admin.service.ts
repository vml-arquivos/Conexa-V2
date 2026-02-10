import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { parse, isValid } from 'date-fns';

function norm(s: string) { return (s || '').trim(); }

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(raw: string): Date {
    if (!raw) return new Date(); 
    // Tenta formato ISO
    let d = new Date(raw);
    if (isValid(d)) return d;
    // Tenta formato BR dd/mm/yyyy
    const parts = raw.split('/');
    if (parts.length === 3) {
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (isValid(d)) return d;
    }
    return new Date(); // Fallback
  }

  async importStructureCsv(file: Express.Multer.File, user: any) {
    if (!file?.buffer) throw new BadRequestException('Arquivo vazio');
    
    const rows: any[] = [];
    await new Promise((resolve, reject) => {
      Readable.from(file.buffer)
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let stats = { classroomsNew: 0, studentsNew: 0 };
    // Se não tiver unitId no user, usa um default para teste
    const unitId = user.unitId || 'default-unit-cepi'; 

    for (const row of rows) {
      // Mapeamento das colunas exatas do seu Excel
      const nome = norm(row['ALUNO'] || row['ALUNOS'] || row['NOME']);
      const turma = norm(row['TURMA']);
      const nasc = norm(row['NASCIMENTO']);
      
      if (!nome || !turma) continue;

      // 1. Criar/Buscar Turma
      let classroom = await this.prisma.classroom.findFirst({
        where: { unitId, name: turma }
      });

      if (!classroom) {
        classroom = await this.prisma.classroom.create({
          data: {
            name: turma,
            code: turma.toUpperCase().replace(/\s+/g, '_'),
            unitId
          }
        });
        stats.classroomsNew++;
      }

      // 2. Criar Aluno
      const names = nome.split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || '.';
      const dob = this.parseDate(nasc);

      const student = await this.prisma.student.create({
        data: {
          firstName,
          lastName,
          birthDate: dob,
          unitId,
          classroomId: classroom.id
        }
      });
      stats.studentsNew++;

      // 3. Matrícula
      await this.prisma.enrollment.create({
        data: {
          childId: student.id,
          classroomId: classroom.id,
          enrollmentDate: new Date(),
          status: 'ATIVA'
        }
      });
    }

    return { success: true, stats };
  }
}
