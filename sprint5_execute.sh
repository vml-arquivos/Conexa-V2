# 🚀 SPRINT 5: SECRETARIA DIGITAL & IMPORTADOR CEPI 2026 (FINAL)
# OBJETIVO: Criar módulo Admin, Tabela de Materiais e Importar Alunos Reais

echo "🔧 Iniciando execução da Sprint 5..."

# 1. GARANTIR DIRETÓRIO E DEPENDÊNCIAS
REPO="/root/Conexa-V2"
[ -d "$REPO" ] || REPO="/home/ubuntu/Conexa-V2"
cd "$REPO" || { echo "[ERRO] Diretório Conexa-V2 não encontrado."; exit 1; }

# Reset seguro para evitar conflitos
git config --global --add safe.directory "$REPO"
git fetch origin --prune
git checkout main
git pull --ff-only || echo "Main já atualizada."
git checkout -B feat/sprint-5-admin-final

echo "📦 Instalando dependências de CSV e Upload..."
npm install csv-parser multer @types/multer date-fns

# 2. ATUALIZAR SCHEMA PRISMA (CATÁLOGO + ESCOLA)
echo "🗄️ Atualizando Banco de Dados..."
node <<'NODE'
const fs = require('fs');
const p = 'prisma/schema.prisma';
let s = fs.readFileSync(p,'utf8');

// Enum Material
if (!s.includes('enum MaterialCatalogCategory')) {
  s += `
enum MaterialCatalogCategory {
  HYGIENE
  PEDAGOGICAL
  FOOD
}
`;
}

// Tabela MaterialCatalog
if (!s.includes('model MaterialCatalog')) {
  s += `
model MaterialCatalog {
  id            String @id @default(cuid())
  item          String @db.VarChar(255)
  category      MaterialCatalogCategory
  unit          String @db.VarChar(50)
  mantenedoraId String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([mantenedoraId, category])
}
`;
}

// Tabela Turma (Classroom)
if (!s.includes('model Classroom')) {
  s += `
model Classroom {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique
  unitId    String
  createdAt DateTime @default(now())
  
  students  Student[]
  enrollments Enrollment[]
  
  @@unique([unitId, code])
}
`;
}

// Tabela Aluno (Student)
if (!s.includes('model Student')) {
  s += `
model Student {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  birthDate   DateTime
  unitId      String
  classroomId String?
  createdAt   DateTime @default(now())

  classroom   Classroom? @relation(fields: [classroomId], references: [id])
  enrollments Enrollment[]
}
`;
}

// Tabela Matrícula (Enrollment)
if (!s.includes('model Enrollment')) {
  s += `
model Enrollment {
  id          String   @id @default(cuid())
  childId     String
  classroomId String
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now())

  student     Student   @relation(fields: [childId], references: [id])
  classroom   Classroom @relation(fields: [classroomId], references: [id])

  @@unique([childId, classroomId])
}
`;
}

fs.writeFileSync(p, s);
NODE

npx prisma format
npx prisma generate

# 3. CRIAR CSV COM DADOS REAIS (BASEADO NOS ANEXOS)
echo "📄 Gerando arquivo 'dados_cepi_2026.csv' com dados reais..."
cat <<EOF > dados_cepi_2026.csv
ALUNO,Cor,SEXO,NASCIMENTO,CPF,TURMA,PROFESSORA
ADAN KHALIL GEMAQUE MARIA,preta,M,2024-05-09,,BERÇARIO II B,JESSICA
ARTHUR MIGUEL NASCIMENTO GAMA,,M,2024-08-02,,BERÇARIO I,RAQUEL
ANA LIZ SANTANA ARAUJO,,M,2024-07-19,,BERÇARIO II A,ELISANGELA
ANTHONY BATISTA PEREIRA BRITO,,M,2024-06-15,,BERÇARIO II A,ELISANGELA
RAVI LORENZO RODRIGUES OLIVEIRA,branca,M,2023-05-16,,MATERNAL I A,LUCIENE
SAYMON SILVA BORGES,parda,M,2023-07-17,,MATERNAL I A,LUCIENE
VALENTINA DOS SANTOS SOARES,parda,F,2023-05-10,,MATERNAL I A,LUCIENE
ADRYAN HENRIQUE DIAS DA SILVA,,M,,,"MATERNAL II",
AGNES HELENA MARQUES BRAGA,,F,,,"MATERNAL II",
ANDRIUS LUCIANO FERRER FERNANDEZ,,M,,,"MATERNAL II",
EOF

# 4. IMPLEMENTAR MÓDULO ADMIN (LÓGICA DE IMPORTAÇÃO)
echo "🏗️ Criando lógica de importação inteligente..."
mkdir -p src/admin

# --- Controller ---
cat <<'EOF' > src/admin/admin.controller.ts
import { Controller, Post, UploadedFile, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('upload/structure')
  @Roles(Role.MANTENEDORA, Role.ADMIN, Role.DEVELOPER)
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadStructure(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.adminService.importStructureCsv(file, req.user);
  }
}
EOF

# --- Service (Adaptado para Colunas Reais) ---
cat <<'EOF' > src/admin/admin.service.ts
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
          status: 'ACTIVE'
        }
      });
    }

    return { success: true, stats };
  }
}
EOF

# --- Module ---
cat <<'EOF' > src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
EOF

# 5. INJETAR NO APP MODULE (CIRÚRGICO)
echo "🔌 Conectando AdminModule..."
node <<'NODE'
const fs = require('fs');
const p = 'src/app.module.ts';
if (fs.existsSync(p)) {
  let s = fs.readFileSync(p, 'utf8');
  // Adiciona o import se não existir
  if (!s.includes("import { AdminModule }")) {
    s = "import { AdminModule } from './admin/admin.module';\n" + s;
  }
  // Adiciona no array de imports
  if (!s.includes('AdminModule,')) {
    s = s.replace(/imports:\s*\[/, "imports: [\n    AdminModule,");
  }
  fs.writeFileSync(p, s);
  console.log("AppModule atualizado.");
}
NODE

# 6. MIGRAÇÃO E BUILD
echo "🏁 Finalizando..."
npx prisma migrate dev --name sprint5_cepi_complete --create-only
npm run build

echo "✅ SPRINT 5 CONCLUÍDA!"
echo "👉 Arquivo 'dados_cepi_2026.csv' gerado na raiz."
echo "👉 Faça o deploy. Depois use o endpoint POST /admin/upload/structure enviando esse CSV."
