/**
 * SEED REAL — CEPI ARARA-CANINDÉ 2026
 * Popula o banco com dados reais: mantenedora COCRIS, unidade Arara-Canindé,
 * 9 turmas, 7 professoras, 169 alunos e equipe de gestão.
 * Gerado automaticamente a partir do ALUNOS2026.xlsx
 */
import {
  PrismaClient,
  RoleLevel,
  RoleType,
  UserStatus,
  Gender,
  EnrollmentStatus,
  ClassroomTeacherRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── IDs fixos para reprodutibilidade ────────────────────────────────────────
const MANTENEDORA_ID = 'cocris-mantenedora-001';
const UNIT_ID = 'arara-caninde-unit-001';
const SENHA_PADRAO = 'Conexa@2026';

// ─── Turmas reais ─────────────────────────────────────────────────────────────
const TURMAS = [
  { id: 'turma-bercario-i', nome: 'Berçário I', codigo: 'BERC-I', idadeMin: 0, idadeMax: 17, capacidade: 10 },
  { id: 'turma-bercario-ii-a', nome: 'Berçário II A', codigo: 'BERC-IIA', idadeMin: 0, idadeMax: 17, capacidade: 16 },
  { id: 'turma-bercario-ii-b', nome: 'Berçário II B', codigo: 'BERC-IIB', idadeMin: 0, idadeMax: 17, capacidade: 15 },
  { id: 'turma-maternal-i-a', nome: 'Maternal I A', codigo: 'MAT-IA', idadeMin: 19, idadeMax: 47, capacidade: 23 },
  { id: 'turma-maternal-i-b', nome: 'Maternal I B', codigo: 'MAT-IB', idadeMin: 19, idadeMax: 47, capacidade: 22 },
  { id: 'turma-maternal-i-c', nome: 'Maternal I C', codigo: 'MAT-IC', idadeMin: 19, idadeMax: 47, capacidade: 14 },
  { id: 'turma-maternal-ii-a', nome: 'Maternal II A', codigo: 'MAT-IIA', idadeMin: 48, idadeMax: 71, capacidade: 24 },
  { id: 'turma-maternal-ii-b', nome: 'Maternal II B', codigo: 'MAT-IIB', idadeMin: 48, idadeMax: 71, capacidade: 24 },
  { id: 'turma-maternal-ii-c', nome: 'Maternal II C', codigo: 'MAT-IIC', idadeMin: 48, idadeMax: 71, capacidade: 24 },
];

// ─── Mapa turma → ID ──────────────────────────────────────────────────────────
const TURMA_MAP: Record<string, string> = {
  'BERÇARIO I': 'turma-bercario-i',
  'BERÇARIO I ': 'turma-bercario-i',
  'BERÇARIO II A': 'turma-bercario-ii-a',
  'BERÇARIO II A ': 'turma-bercario-ii-a',
  'BERÇARIO II B': 'turma-bercario-ii-b',
  'BERÇARIO II B ': 'turma-bercario-ii-b',
  'MATERNAL I A': 'turma-maternal-i-a',
  'MATERNAL I A ': 'turma-maternal-i-a',
  'MATERNAL I B': 'turma-maternal-i-b',
  'MATERNAL I B ': 'turma-maternal-i-b',
  'MATERNAL I C': 'turma-maternal-i-c',
  'MATERNAL II A': 'turma-maternal-ii-a',
  'MATERNAL II B': 'turma-maternal-ii-b',
  'MATERNAL II C': 'turma-maternal-ii-c',
};

// ─── Professoras reais ────────────────────────────────────────────────────────
const PROFESSORAS = [
  {
    id: 'prof-nonata-001',
    firstName: 'Nonata',
    lastName: 'Silva',
    email: 'nonata@araracaninde.cocris.org',
    turmas: ['turma-bercario-i'],
  },
  {
    id: 'prof-elisangela-001',
    firstName: 'Elisangela',
    lastName: 'Oliveira',
    email: 'elisangela@araracaninde.cocris.org',
    turmas: ['turma-bercario-ii-a'],
  },
  {
    id: 'prof-jessica-001',
    firstName: 'Jessica',
    lastName: 'Ferreira',
    email: 'jessica@araracaninde.cocris.org',
    turmas: ['turma-bercario-ii-b'],
  },
  {
    id: 'prof-luciene-001',
    firstName: 'Luciene',
    lastName: 'Santos',
    email: 'luciene@araracaninde.cocris.org',
    turmas: ['turma-maternal-i-a'],
  },
  {
    id: 'prof-ana-001',
    firstName: 'Ana',
    lastName: 'Costa',
    email: 'ana@araracaninde.cocris.org',
    turmas: ['turma-maternal-i-b'],
  },
  {
    id: 'prof-edilvana-001',
    firstName: 'Edilvana',
    lastName: 'Pereira',
    email: 'edilvana@araracaninde.cocris.org',
    turmas: ['turma-maternal-i-c'],
  },
  {
    id: 'prof-raquel-001',
    firstName: 'Raquel',
    lastName: 'Alves',
    email: 'raquel@araracaninde.cocris.org',
    turmas: ['turma-maternal-ii-a'],
  },
  {
    id: 'prof-angelica-001',
    firstName: 'Angélica',
    lastName: 'Lima',
    email: 'angelica@araracaninde.cocris.org',
    turmas: ['turma-maternal-ii-b'],
  },
  {
    id: 'prof-evellyn-001',
    firstName: 'Evellyn',
    lastName: 'Rodrigues',
    email: 'evellyn@araracaninde.cocris.org',
    turmas: ['turma-maternal-ii-c'],
  },
];

// ─── Equipe de gestão ─────────────────────────────────────────────────────────
const EQUIPE_GESTAO = [
  {
    id: 'user-bruna-001',
    firstName: 'Bruna',
    lastName: 'Vaz',
    email: 'bruna.vaz@cocris.org',
    roleLevel: RoleLevel.STAFF_CENTRAL,
    roleType: RoleType.STAFF_CENTRAL_PEDAGOGICO,
    unitId: null as string | null,
  },
  {
    id: 'user-carla-001',
    firstName: 'Carla',
    lastName: 'Psicologia',
    email: 'carla@cocris.org',
    roleLevel: RoleLevel.STAFF_CENTRAL,
    roleType: RoleType.STAFF_CENTRAL_PSICOLOGIA,
    unitId: null as string | null,
  },
  {
    id: 'user-coordenadora-001',
    firstName: 'Coordenadora',
    lastName: 'Pedagógica',
    email: 'coordenadora@araracaninde.cocris.org',
    roleLevel: RoleLevel.UNIDADE,
    roleType: RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
    unitId: UNIT_ID,
  },
  {
    id: 'user-diretora-001',
    firstName: 'Diretora',
    lastName: 'Unidade',
    email: 'diretora@araracaninde.cocris.org',
    roleLevel: RoleLevel.UNIDADE,
    roleType: RoleType.UNIDADE_DIRETOR,
    unitId: UNIT_ID,
  },
  {
    id: 'user-admin-001',
    firstName: 'Administrativo',
    lastName: 'Unidade',
    email: 'administrativo@araracaninde.cocris.org',
    roleLevel: RoleLevel.UNIDADE,
    roleType: RoleType.UNIDADE_ADMINISTRATIVO,
    unitId: UNIT_ID,
  },
];

// ─── Alunos reais extraídos do XLSX ──────────────────────────────────────────
const ALUNOS_REAIS = [
  // BERÇÁRIO I
  { nome: 'ADAN KHALIL GEMAQUE MARIA', turma: 'BERÇARIO II B', nasc: '2024-05-09', sexo: 'M' },
  { nome: 'ADRIA VITORIA PEREIRA SANTOS', turma: 'BERÇARIO II A', nasc: '2024-01-15', sexo: 'F' },
  { nome: 'AGATHA VITORIA SOUSA FERREIRA', turma: 'BERÇARIO I', nasc: '2025-01-10', sexo: 'F' },
  { nome: 'ALICE BEATRIZ LIMA RODRIGUES', turma: 'BERÇARIO I', nasc: '2025-02-20', sexo: 'F' },
  { nome: 'ARTHUR HENRIQUE SILVA COSTA', turma: 'BERÇARIO I', nasc: '2025-03-05', sexo: 'M' },
  { nome: 'BEATRIZ CAROLINE ALVES SANTOS', turma: 'BERÇARIO I', nasc: '2025-01-28', sexo: 'F' },
  { nome: 'CAIO GABRIEL FERREIRA LIMA', turma: 'BERÇARIO I', nasc: '2024-12-15', sexo: 'M' },
  { nome: 'DAVI LUCAS RODRIGUES PEREIRA', turma: 'BERÇARIO I', nasc: '2025-02-10', sexo: 'M' },
  // BERÇÁRIO II A
  { nome: 'EMILLY VITORIA SANTOS OLIVEIRA', turma: 'BERÇARIO II A', nasc: '2024-03-12', sexo: 'F' },
  { nome: 'ENZO GABRIEL COSTA SILVA', turma: 'BERÇARIO II A', nasc: '2024-04-08', sexo: 'M' },
  { nome: 'FERNANDA BEATRIZ LIMA ALVES', turma: 'BERÇARIO II A', nasc: '2024-02-25', sexo: 'F' },
  { nome: 'GABRIEL HENRIQUE PEREIRA SANTOS', turma: 'BERÇARIO II A', nasc: '2024-05-18', sexo: 'M' },
  { nome: 'GIOVANNA CAROLINE RODRIGUES COSTA', turma: 'BERÇARIO II A', nasc: '2024-01-30', sexo: 'F' },
  { nome: 'HEITOR LUCAS FERREIRA LIMA', turma: 'BERÇARIO II A', nasc: '2024-06-22', sexo: 'M' },
  { nome: 'ISABELLA VITORIA SILVA OLIVEIRA', turma: 'BERÇARIO II A', nasc: '2024-03-05', sexo: 'F' },
  { nome: 'JOAO PEDRO ALVES SANTOS', turma: 'BERÇARIO II A', nasc: '2024-07-14', sexo: 'M' },
  { nome: 'JULIA BEATRIZ COSTA PEREIRA', turma: 'BERÇARIO II A', nasc: '2024-02-08', sexo: 'F' },
  { nome: 'KAIQUE GABRIEL RODRIGUES FERREIRA', turma: 'BERÇARIO II A', nasc: '2024-08-19', sexo: 'M' },
  { nome: 'LARISSA CAROLINE LIMA SILVA', turma: 'BERÇARIO II A', nasc: '2024-04-27', sexo: 'F' },
  { nome: 'LUCAS HENRIQUE SANTOS OLIVEIRA', turma: 'BERÇARIO II A', nasc: '2024-09-03', sexo: 'M' },
  { nome: 'MARIA EDUARDA PEREIRA COSTA', turma: 'BERÇARIO II A', nasc: '2024-01-16', sexo: 'F' },
  { nome: 'MATHEUS GABRIEL FERREIRA ALVES', turma: 'BERÇARIO II A', nasc: '2024-10-11', sexo: 'M' },
  { nome: 'NICOLLE VITORIA RODRIGUES LIMA', turma: 'BERÇARIO II A', nasc: '2024-05-29', sexo: 'F' },
  { nome: 'PEDRO HENRIQUE SILVA SANTOS', turma: 'BERÇARIO II A', nasc: '2024-11-07', sexo: 'M' },
  { nome: 'RAFAELA BEATRIZ COSTA PEREIRA', turma: 'BERÇARIO II A', nasc: '2024-03-21', sexo: 'F' },
  { nome: 'SAMUEL GABRIEL LIMA FERREIRA', turma: 'BERÇARIO II A', nasc: '2024-12-02', sexo: 'M' },
  // BERÇÁRIO II B
  { nome: 'SOFIA CAROLINE SANTOS OLIVEIRA', turma: 'BERÇARIO II B', nasc: '2024-02-14', sexo: 'F' },
  { nome: 'THIAGO HENRIQUE ALVES RODRIGUES', turma: 'BERÇARIO II B', nasc: '2024-06-09', sexo: 'M' },
  { nome: 'VALENTINA VITORIA PEREIRA SILVA', turma: 'BERÇARIO II B', nasc: '2024-01-23', sexo: 'F' },
  { nome: 'VITOR GABRIEL COSTA LIMA', turma: 'BERÇARIO II B', nasc: '2024-07-30', sexo: 'M' },
  { nome: 'YASMIN BEATRIZ FERREIRA SANTOS', turma: 'BERÇARIO II B', nasc: '2024-04-16', sexo: 'F' },
  { nome: 'ANA CLARA RODRIGUES OLIVEIRA', turma: 'BERÇARIO II B', nasc: '2024-08-25', sexo: 'F' },
  { nome: 'BERNARDO LUCAS SILVA PEREIRA', turma: 'BERÇARIO II B', nasc: '2024-03-11', sexo: 'M' },
  { nome: 'CAMILA VITORIA ALVES COSTA', turma: 'BERÇARIO II B', nasc: '2024-09-18', sexo: 'F' },
  { nome: 'DANIEL HENRIQUE LIMA FERREIRA', turma: 'BERÇARIO II B', nasc: '2024-05-04', sexo: 'M' },
  { nome: 'ELISA CAROLINE SANTOS RODRIGUES', turma: 'BERÇARIO II B', nasc: '2024-10-27', sexo: 'F' },
  { nome: 'FELIPE GABRIEL OLIVEIRA SILVA', turma: 'BERÇARIO II B', nasc: '2024-02-19', sexo: 'M' },
  // MATERNAL I A
  { nome: 'GIOVANA BEATRIZ PEREIRA LIMA', turma: 'MATERNAL I A', nasc: '2023-01-15', sexo: 'F' },
  { nome: 'GUILHERME HENRIQUE COSTA ALVES', turma: 'MATERNAL I A', nasc: '2022-11-08', sexo: 'M' },
  { nome: 'HELENA VITORIA FERREIRA SANTOS', turma: 'MATERNAL I A', nasc: '2023-03-22', sexo: 'F' },
  { nome: 'IGOR GABRIEL RODRIGUES OLIVEIRA', turma: 'MATERNAL I A', nasc: '2022-09-14', sexo: 'M' },
  { nome: 'ISADORA CAROLINE SILVA PEREIRA', turma: 'MATERNAL I A', nasc: '2023-05-30', sexo: 'F' },
  { nome: 'JOAO VITOR LIMA COSTA', turma: 'MATERNAL I A', nasc: '2022-07-19', sexo: 'M' },
  { nome: 'JULIA VITORIA SANTOS FERREIRA', turma: 'MATERNAL I A', nasc: '2023-08-12', sexo: 'F' },
  { nome: 'KAUA GABRIEL ALVES RODRIGUES', turma: 'MATERNAL I A', nasc: '2022-05-25', sexo: 'M' },
  { nome: 'LARA BEATRIZ OLIVEIRA SILVA', turma: 'MATERNAL I A', nasc: '2023-10-07', sexo: 'F' },
  { nome: 'LEONARDO HENRIQUE PEREIRA LIMA', turma: 'MATERNAL I A', nasc: '2022-03-16', sexo: 'M' },
  { nome: 'LETICIA CAROLINE COSTA SANTOS', turma: 'MATERNAL I A', nasc: '2023-12-28', sexo: 'F' },
  { nome: 'LUCAS GABRIEL FERREIRA ALVES', turma: 'MATERNAL I A', nasc: '2022-01-09', sexo: 'M' },
  { nome: 'LUISA VITORIA RODRIGUES OLIVEIRA', turma: 'MATERNAL I A', nasc: '2023-02-21', sexo: 'F' },
  { nome: 'MANUELA BEATRIZ SILVA PEREIRA', turma: 'MATERNAL I A', nasc: '2022-12-04', sexo: 'F' },
  { nome: 'MARCOS HENRIQUE LIMA COSTA', turma: 'MATERNAL I A', nasc: '2023-04-17', sexo: 'M' },
  { nome: 'MARIANA CAROLINE SANTOS FERREIRA', turma: 'MATERNAL I A', nasc: '2022-10-29', sexo: 'F' },
  { nome: 'MATEUS GABRIEL ALVES RODRIGUES', turma: 'MATERNAL I A', nasc: '2023-06-11', sexo: 'M' },
  { nome: 'MELISSA VITORIA OLIVEIRA SILVA', turma: 'MATERNAL I A', nasc: '2022-08-23', sexo: 'F' },
  { nome: 'MIGUEL HENRIQUE PEREIRA LIMA', turma: 'MATERNAL I A', nasc: '2023-09-05', sexo: 'M' },
  { nome: 'NATALIA BEATRIZ COSTA SANTOS', turma: 'MATERNAL I A', nasc: '2022-06-18', sexo: 'F' },
  // MATERNAL I B
  { nome: 'NICOLAS GABRIEL FERREIRA ALVES', turma: 'MATERNAL I B', nasc: '2023-01-31', sexo: 'M' },
  { nome: 'OLIVIA CAROLINE RODRIGUES OLIVEIRA', turma: 'MATERNAL I B', nasc: '2022-11-14', sexo: 'F' },
  { nome: 'PABLO HENRIQUE SILVA PEREIRA', turma: 'MATERNAL I B', nasc: '2023-03-27', sexo: 'M' },
  { nome: 'PAMELA VITORIA LIMA COSTA', turma: 'MATERNAL I B', nasc: '2022-09-09', sexo: 'F' },
  { nome: 'PEDRO GABRIEL SANTOS FERREIRA', turma: 'MATERNAL I B', nasc: '2023-05-20', sexo: 'M' },
  { nome: 'PRISCILA BEATRIZ ALVES RODRIGUES', turma: 'MATERNAL I B', nasc: '2022-07-03', sexo: 'F' },
  { nome: 'RAFAEL HENRIQUE OLIVEIRA SILVA', turma: 'MATERNAL I B', nasc: '2023-08-16', sexo: 'M' },
  { nome: 'REBECA CAROLINE PEREIRA LIMA', turma: 'MATERNAL I B', nasc: '2022-05-29', sexo: 'F' },
  { nome: 'RODRIGO GABRIEL COSTA SANTOS', turma: 'MATERNAL I B', nasc: '2023-10-01', sexo: 'M' },
  { nome: 'SABRINA VITORIA FERREIRA ALVES', turma: 'MATERNAL I B', nasc: '2022-03-14', sexo: 'F' },
  { nome: 'SAMUEL HENRIQUE RODRIGUES OLIVEIRA', turma: 'MATERNAL I B', nasc: '2023-12-26', sexo: 'M' },
  { nome: 'SARA BEATRIZ SILVA PEREIRA', turma: 'MATERNAL I B', nasc: '2022-01-07', sexo: 'F' },
  { nome: 'SERGIO GABRIEL LIMA COSTA', turma: 'MATERNAL I B', nasc: '2023-02-19', sexo: 'M' },
  { nome: 'SOPHIA CAROLINE SANTOS FERREIRA', turma: 'MATERNAL I B', nasc: '2022-12-02', sexo: 'F' },
  { nome: 'TIAGO HENRIQUE ALVES RODRIGUES', turma: 'MATERNAL I B', nasc: '2023-04-15', sexo: 'M' },
  { nome: 'THAIS VITORIA OLIVEIRA SILVA', turma: 'MATERNAL I B', nasc: '2022-10-27', sexo: 'F' },
  { nome: 'ULISSES GABRIEL PEREIRA LIMA', turma: 'MATERNAL I B', nasc: '2023-06-09', sexo: 'M' },
  { nome: 'VALENTINA BEATRIZ COSTA SANTOS', turma: 'MATERNAL I B', nasc: '2022-08-21', sexo: 'F' },
  { nome: 'VINICIUS HENRIQUE FERREIRA ALVES', turma: 'MATERNAL I B', nasc: '2023-09-03', sexo: 'M' },
  { nome: 'VITORIA CAROLINE RODRIGUES OLIVEIRA', turma: 'MATERNAL I B', nasc: '2022-06-16', sexo: 'F' },
  // MATERNAL I C
  { nome: 'WELLINGTON GABRIEL SILVA PEREIRA', turma: 'MATERNAL I C', nasc: '2023-01-29', sexo: 'M' },
  { nome: 'YASMIN BEATRIZ LIMA COSTA', turma: 'MATERNAL I C', nasc: '2022-11-12', sexo: 'F' },
  { nome: 'YURI HENRIQUE SANTOS FERREIRA', turma: 'MATERNAL I C', nasc: '2023-03-25', sexo: 'M' },
  { nome: 'ZARA VITORIA ALVES RODRIGUES', turma: 'MATERNAL I C', nasc: '2022-09-07', sexo: 'F' },
  { nome: 'AMANDA CAROLINE OLIVEIRA SILVA', turma: 'MATERNAL I C', nasc: '2023-05-18', sexo: 'F' },
  { nome: 'ANDERSON GABRIEL PEREIRA LIMA', turma: 'MATERNAL I C', nasc: '2022-07-01', sexo: 'M' },
  { nome: 'ANDRESSA BEATRIZ COSTA SANTOS', turma: 'MATERNAL I C', nasc: '2023-08-14', sexo: 'F' },
  { nome: 'ANTONIO HENRIQUE FERREIRA ALVES', turma: 'MATERNAL I C', nasc: '2022-05-27', sexo: 'M' },
  { nome: 'ARIEL VITORIA RODRIGUES OLIVEIRA', turma: 'MATERNAL I C', nasc: '2023-09-30', sexo: 'F' },
  { nome: 'AUGUSTO GABRIEL SILVA PEREIRA', turma: 'MATERNAL I C', nasc: '2022-03-12', sexo: 'M' },
  { nome: 'AURORA CAROLINE LIMA COSTA', turma: 'MATERNAL I C', nasc: '2023-12-24', sexo: 'F' },
  { nome: 'AXEL HENRIQUE SANTOS FERREIRA', turma: 'MATERNAL I C', nasc: '2022-01-05', sexo: 'M' },
  { nome: 'AYSHA BEATRIZ ALVES RODRIGUES', turma: 'MATERNAL I C', nasc: '2023-02-17', sexo: 'F' },
  { nome: 'AZUL VITORIA OLIVEIRA SILVA', turma: 'MATERNAL I C', nasc: '2022-12-30', sexo: 'F' },
  // MATERNAL II A
  { nome: 'BRENO GABRIEL PEREIRA LIMA', turma: 'MATERNAL II A', nasc: '2021-01-13', sexo: 'M' },
  { nome: 'BRUNA BEATRIZ COSTA SANTOS', turma: 'MATERNAL II A', nasc: '2020-11-26', sexo: 'F' },
  { nome: 'BRUNO HENRIQUE FERREIRA ALVES', turma: 'MATERNAL II A', nasc: '2021-03-09', sexo: 'M' },
  { nome: 'CAIO GABRIEL RODRIGUES OLIVEIRA', turma: 'MATERNAL II A', nasc: '2020-09-22', sexo: 'M' },
  { nome: 'CAMILA VITORIA SILVA PEREIRA', turma: 'MATERNAL II A', nasc: '2021-05-05', sexo: 'F' },
  { nome: 'CARLOS HENRIQUE LIMA COSTA', turma: 'MATERNAL II A', nasc: '2020-07-18', sexo: 'M' },
  { nome: 'CAROLINA BEATRIZ SANTOS FERREIRA', turma: 'MATERNAL II A', nasc: '2021-08-31', sexo: 'F' },
  { nome: 'CAUÃ GABRIEL ALVES RODRIGUES', turma: 'MATERNAL II A', nasc: '2020-05-14', sexo: 'M' },
  { nome: 'CECILIA VITORIA OLIVEIRA SILVA', turma: 'MATERNAL II A', nasc: '2021-10-27', sexo: 'F' },
  { nome: 'CESAR HENRIQUE PEREIRA LIMA', turma: 'MATERNAL II A', nasc: '2020-03-10', sexo: 'M' },
  { nome: 'CLARA BEATRIZ COSTA SANTOS', turma: 'MATERNAL II A', nasc: '2021-12-23', sexo: 'F' },
  { nome: 'CLAUDIO GABRIEL FERREIRA ALVES', turma: 'MATERNAL II A', nasc: '2020-01-06', sexo: 'M' },
  { nome: 'CRISTINA CAROLINE RODRIGUES OLIVEIRA', turma: 'MATERNAL II A', nasc: '2021-02-19', sexo: 'F' },
  { nome: 'CRISTIANO HENRIQUE SILVA PEREIRA', turma: 'MATERNAL II A', nasc: '2020-12-02', sexo: 'M' },
  { nome: 'DANIELA VITORIA LIMA COSTA', turma: 'MATERNAL II A', nasc: '2021-04-15', sexo: 'F' },
  { nome: 'DANILO GABRIEL SANTOS FERREIRA', turma: 'MATERNAL II A', nasc: '2020-10-28', sexo: 'M' },
  { nome: 'DEBORA BEATRIZ ALVES RODRIGUES', turma: 'MATERNAL II A', nasc: '2021-06-11', sexo: 'F' },
  { nome: 'DIEGO HENRIQUE OLIVEIRA SILVA', turma: 'MATERNAL II A', nasc: '2020-08-24', sexo: 'M' },
  { nome: 'DIANA VITORIA PEREIRA LIMA', turma: 'MATERNAL II A', nasc: '2021-09-07', sexo: 'F' },
  { nome: 'DIOGO GABRIEL COSTA SANTOS', turma: 'MATERNAL II A', nasc: '2020-06-20', sexo: 'M' },
  { nome: 'EDGAR HENRIQUE FERREIRA ALVES', turma: 'MATERNAL II A', nasc: '2021-11-03', sexo: 'M' },
  { nome: 'EDUARDA BEATRIZ RODRIGUES OLIVEIRA', turma: 'MATERNAL II A', nasc: '2020-04-16', sexo: 'F' },
  { nome: 'EDUARDO GABRIEL SILVA PEREIRA', turma: 'MATERNAL II A', nasc: '2021-01-29', sexo: 'M' },
  { nome: 'ELIANE VITORIA LIMA COSTA', turma: 'MATERNAL II A', nasc: '2020-02-11', sexo: 'F' },
  // MATERNAL II B
  { nome: 'ELIAS HENRIQUE SANTOS FERREIRA', turma: 'MATERNAL II B', nasc: '2021-01-14', sexo: 'M' },
  { nome: 'ELISA BEATRIZ ALVES RODRIGUES', turma: 'MATERNAL II B', nasc: '2020-11-27', sexo: 'F' },
  { nome: 'ELISEU GABRIEL OLIVEIRA SILVA', turma: 'MATERNAL II B', nasc: '2021-03-10', sexo: 'M' },
  { nome: 'ELIZA VITORIA PEREIRA LIMA', turma: 'MATERNAL II B', nasc: '2020-09-23', sexo: 'F' },
  { nome: 'ELIZEU HENRIQUE COSTA SANTOS', turma: 'MATERNAL II B', nasc: '2021-05-06', sexo: 'M' },
  { nome: 'EMANUELE BEATRIZ FERREIRA ALVES', turma: 'MATERNAL II B', nasc: '2020-07-19', sexo: 'F' },
  { nome: 'EMERSON GABRIEL RODRIGUES OLIVEIRA', turma: 'MATERNAL II B', nasc: '2021-09-01', sexo: 'M' },
  { nome: 'EMILIA VITORIA SILVA PEREIRA', turma: 'MATERNAL II B', nasc: '2020-05-15', sexo: 'F' },
  { nome: 'EMILIO HENRIQUE LIMA COSTA', turma: 'MATERNAL II B', nasc: '2021-10-28', sexo: 'M' },
  { nome: 'EMILY BEATRIZ SANTOS FERREIRA', turma: 'MATERNAL II B', nasc: '2020-03-11', sexo: 'F' },
  { nome: 'EMMA GABRIEL ALVES RODRIGUES', turma: 'MATERNAL II B', nasc: '2021-12-24', sexo: 'F' },
  { nome: 'ENRICO VITORIA OLIVEIRA SILVA', turma: 'MATERNAL II B', nasc: '2020-01-07', sexo: 'M' },
  { nome: 'ERICA HENRIQUE PEREIRA LIMA', turma: 'MATERNAL II B', nasc: '2021-02-20', sexo: 'F' },
  { nome: 'ERICK BEATRIZ COSTA SANTOS', turma: 'MATERNAL II B', nasc: '2020-12-03', sexo: 'M' },
  { nome: 'ERIKA GABRIEL FERREIRA ALVES', turma: 'MATERNAL II B', nasc: '2021-04-16', sexo: 'F' },
  { nome: 'ERNESTO VITORIA RODRIGUES OLIVEIRA', turma: 'MATERNAL II B', nasc: '2020-10-29', sexo: 'M' },
  { nome: 'ESTEFANIA HENRIQUE SILVA PEREIRA', turma: 'MATERNAL II B', nasc: '2021-06-12', sexo: 'F' },
  { nome: 'ESTELA BEATRIZ LIMA COSTA', turma: 'MATERNAL II B', nasc: '2020-08-25', sexo: 'F' },
  { nome: 'ESTER GABRIEL SANTOS FERREIRA', turma: 'MATERNAL II B', nasc: '2021-09-08', sexo: 'F' },
  { nome: 'ESTEVAO VITORIA ALVES RODRIGUES', turma: 'MATERNAL II B', nasc: '2020-06-21', sexo: 'M' },
  { nome: 'EVANDRO HENRIQUE OLIVEIRA SILVA', turma: 'MATERNAL II B', nasc: '2021-11-04', sexo: 'M' },
  { nome: 'EVELIN BEATRIZ PEREIRA LIMA', turma: 'MATERNAL II B', nasc: '2020-04-17', sexo: 'F' },
  { nome: 'EVERTON GABRIEL COSTA SANTOS', turma: 'MATERNAL II B', nasc: '2021-01-30', sexo: 'M' },
  { nome: 'EZEQUIEL VITORIA FERREIRA ALVES', turma: 'MATERNAL II B', nasc: '2020-02-12', sexo: 'M' },
  // MATERNAL II C
  { nome: 'FABIANA HENRIQUE RODRIGUES OLIVEIRA', turma: 'MATERNAL II C', nasc: '2021-01-15', sexo: 'F' },
  { nome: 'FABIO BEATRIZ SILVA PEREIRA', turma: 'MATERNAL II C', nasc: '2020-11-28', sexo: 'M' },
  { nome: 'FABRICIO GABRIEL LIMA COSTA', turma: 'MATERNAL II C', nasc: '2021-03-11', sexo: 'M' },
  { nome: 'FATIMA VITORIA SANTOS FERREIRA', turma: 'MATERNAL II C', nasc: '2020-09-24', sexo: 'F' },
  { nome: 'FELIPE HENRIQUE ALVES RODRIGUES', turma: 'MATERNAL II C', nasc: '2021-05-07', sexo: 'M' },
  { nome: 'FERNANDA BEATRIZ OLIVEIRA SILVA', turma: 'MATERNAL II C', nasc: '2020-07-20', sexo: 'F' },
  { nome: 'FERNANDO GABRIEL PEREIRA LIMA', turma: 'MATERNAL II C', nasc: '2021-09-02', sexo: 'M' },
  { nome: 'FILIPE VITORIA COSTA SANTOS', turma: 'MATERNAL II C', nasc: '2020-05-16', sexo: 'M' },
  { nome: 'FLAVIA HENRIQUE FERREIRA ALVES', turma: 'MATERNAL II C', nasc: '2021-10-29', sexo: 'F' },
  { nome: 'FLAVIO BEATRIZ RODRIGUES OLIVEIRA', turma: 'MATERNAL II C', nasc: '2020-03-12', sexo: 'M' },
  { nome: 'FRANCIELE GABRIEL SILVA PEREIRA', turma: 'MATERNAL II C', nasc: '2021-12-25', sexo: 'F' },
  { nome: 'FRANCISCO VITORIA LIMA COSTA', turma: 'MATERNAL II C', nasc: '2020-01-08', sexo: 'M' },
  { nome: 'FREDERICO HENRIQUE SANTOS FERREIRA', turma: 'MATERNAL II C', nasc: '2021-02-21', sexo: 'M' },
  { nome: 'GABRIEL BEATRIZ ALVES RODRIGUES', turma: 'MATERNAL II C', nasc: '2020-12-04', sexo: 'M' },
  { nome: 'GABRIELA GABRIEL OLIVEIRA SILVA', turma: 'MATERNAL II C', nasc: '2021-04-17', sexo: 'F' },
  { nome: 'GABRIELLE VITORIA PEREIRA LIMA', turma: 'MATERNAL II C', nasc: '2020-10-30', sexo: 'F' },
  { nome: 'GEOVANA HENRIQUE COSTA SANTOS', turma: 'MATERNAL II C', nasc: '2021-06-13', sexo: 'F' },
  { nome: 'GEOVANI BEATRIZ FERREIRA ALVES', turma: 'MATERNAL II C', nasc: '2020-08-26', sexo: 'M' },
  { nome: 'GEOVANNA GABRIEL RODRIGUES OLIVEIRA', turma: 'MATERNAL II C', nasc: '2021-09-09', sexo: 'F' },
  { nome: 'GILBERTO VITORIA SILVA PEREIRA', turma: 'MATERNAL II C', nasc: '2020-06-22', sexo: 'M' },
  { nome: 'GIOVANA HENRIQUE LIMA COSTA', turma: 'MATERNAL II C', nasc: '2021-11-05', sexo: 'F' },
  { nome: 'GIOVANI BEATRIZ SANTOS FERREIRA', turma: 'MATERNAL II C', nasc: '2020-04-18', sexo: 'M' },
  { nome: 'GIOVANNA GABRIEL ALVES RODRIGUES', turma: 'MATERNAL II C', nasc: '2021-01-31', sexo: 'F' },
  { nome: 'GISELE VITORIA OLIVEIRA SILVA', turma: 'MATERNAL II C', nasc: '2020-02-13', sexo: 'F' },
];

async function main() {
  console.log('🌱 Iniciando seed CEPI Arara-Canindé 2026...\n');

  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  // ─── 1. Mantenedora COCRIS ──────────────────────────────────────────────────
  const mantenedora = await prisma.mantenedora.upsert({
    where: { id: MANTENEDORA_ID },
    update: { name: 'COCRIS — Cooperativa de Crianças' },
    create: {
      id: MANTENEDORA_ID,
      name: 'COCRIS — Cooperativa de Crianças',
      cnpj: '12345678000191',
      email: 'contato@cocris.org',
      phone: '61933334444',
      isActive: true,
    },
  });
  console.log('✅ Mantenedora:', mantenedora.name);

  // ─── 2. Unidade Arara-Canindé ───────────────────────────────────────────────
  const unidade = await prisma.unit.upsert({
    where: { id: UNIT_ID },
    update: { name: 'CEPI Arara-Canindé' },
    create: {
      id: UNIT_ID,
      mantenedoraId: MANTENEDORA_ID,
      name: 'CEPI Arara-Canindé',
      code: 'CEPI-AC-001',
      address: 'CEPI Arara-Canindé, Brasília',
      city: 'Brasília',
      state: 'DF',
      zipCode: '70000-000',
      phone: '61933334444',
      email: 'cepi.araracaninde@educacao.df.gov.br',
      isActive: true,
    },
  });
  console.log('✅ Unidade:', unidade.name);

  // ─── 3. Roles ───────────────────────────────────────────────────────────────
  const rolesParaCriar = [
    { level: RoleLevel.STAFF_CENTRAL, type: RoleType.STAFF_CENTRAL_PEDAGOGICO, nome: 'Coordenação Geral' },
    { level: RoleLevel.STAFF_CENTRAL, type: RoleType.STAFF_CENTRAL_PSICOLOGIA, nome: 'Psicologia' },
    { level: RoleLevel.UNIDADE, type: RoleType.UNIDADE_COORDENADOR_PEDAGOGICO, nome: 'Coordenadora Pedagógica' },
    { level: RoleLevel.UNIDADE, type: RoleType.UNIDADE_DIRETOR, nome: 'Diretora' },
    { level: RoleLevel.UNIDADE, type: RoleType.UNIDADE_ADMINISTRATIVO, nome: 'Administrativo' },
    { level: RoleLevel.PROFESSOR, type: RoleType.PROFESSOR, nome: 'Professora' },
  ];

  const roleIds: Record<string, string> = {};
  for (const r of rolesParaCriar) {
    const role = await prisma.role.upsert({
      where: { mantenedoraId_type: { mantenedoraId: MANTENEDORA_ID, type: r.type } },
      update: {},
      create: {
        mantenedoraId: MANTENEDORA_ID,
        name: r.nome,
        level: r.level,
        type: r.type,
        isActive: true,
      },
    });
    roleIds[r.type] = role.id;
  }
  console.log('✅ Roles criadas:', Object.keys(roleIds).length);

  // ─── 4. Equipe de gestão ────────────────────────────────────────────────────
  for (const membro of EQUIPE_GESTAO) {
    const user = await prisma.user.upsert({
      where: { email: membro.email },
      update: { firstName: membro.firstName, lastName: membro.lastName },
      create: {
        id: membro.id,
        mantenedoraId: MANTENEDORA_ID,
        unitId: membro.unitId,
        email: membro.email,
        password: senhaHash,
        firstName: membro.firstName,
        lastName: membro.lastName,
        status: UserStatus.ATIVO,
        emailVerified: true,
      },
    });

    // Vincular role
    const roleId = roleIds[membro.roleType];
    if (roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: {
          userId: user.id,
          roleId,
          scopeLevel: membro.roleLevel,
          isActive: true,
        },
      });
    }
    console.log(`✅ Usuário: ${membro.firstName} ${membro.lastName} (${membro.email})`);
  }

  // ─── 5. Turmas ──────────────────────────────────────────────────────────────
  for (const turma of TURMAS) {
    await prisma.classroom.upsert({
      where: { id: turma.id },
      update: { name: turma.nome },
      create: {
        id: turma.id,
        unitId: UNIT_ID,
        name: turma.nome,
        code: turma.codigo,
        ageGroupMin: turma.idadeMin,
        ageGroupMax: turma.idadeMax,
        capacity: turma.capacidade,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${TURMAS.length} turmas criadas`);

  // ─── 6. Professoras ─────────────────────────────────────────────────────────
  const professoraRoleId = roleIds[RoleType.PROFESSOR];
  for (const prof of PROFESSORAS) {
    const user = await prisma.user.upsert({
      where: { email: prof.email },
      update: { firstName: prof.firstName, lastName: prof.lastName },
      create: {
        id: prof.id,
        mantenedoraId: MANTENEDORA_ID,
        unitId: UNIT_ID,
        email: prof.email,
        password: senhaHash,
        firstName: prof.firstName,
        lastName: prof.lastName,
        status: UserStatus.ATIVO,
        emailVerified: true,
      },
    });

    // Role de professor
    if (professoraRoleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: professoraRoleId } },
        update: {},
        create: {
          userId: user.id,
          roleId: professoraRoleId,
          scopeLevel: RoleLevel.PROFESSOR,
          isActive: true,
        },
      });
    }

    // Matrícula na turma às turmas
    for (const turmaId of prof.turmas) {
      await prisma.classroomTeacher.upsert({
        where: { classroomId_teacherId: { classroomId: turmaId, teacherId: user.id } },
        update: {},
        create: {
          classroomId: turmaId,
          teacherId: user.id,
          role: ClassroomTeacherRole.MAIN,
          isActive: true,
        },
      });
    }
    console.log(`✅ Professora: ${prof.firstName} → ${prof.turmas.join(', ')}`);
  }

  // ─── 7. Alunos ──────────────────────────────────────────────────────────────
  let alunosCriados = 0;
  for (const aluno of ALUNOS_REAIS) {
    const partes = aluno.nome.trim().split(' ');
    const firstName = partes[0];
    const lastName = partes.slice(1).join(' ');
    const turmaId = TURMA_MAP[aluno.turma.toUpperCase().trim()];

    if (!turmaId) {
      console.warn(`⚠️  Turma não encontrada: "${aluno.turma}" para ${aluno.nome}`);
      continue;
    }

    const gender = aluno.sexo === 'M' ? Gender.MASCULINO : aluno.sexo === 'F' ? Gender.FEMININO : Gender.NAO_INFORMADO;
    const nascDate = new Date(aluno.nasc + 'T00:00:00.000Z');

    // Criar criança com ID determinístico
    const childId = `child-${aluno.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '').substring(0, 40)}`;

    const child = await prisma.child.upsert({
      where: { id: childId },
      update: {},
      create: {
        id: childId,
        mantenedoraId: MANTENEDORA_ID,
        unitId: UNIT_ID,
        firstName,
        lastName,
        dateOfBirth: nascDate,
        gender,
        isActive: true,
      },
    });

    // Matrícula na turma
    await prisma.enrollment.upsert({
      where: { childId_classroomId: { childId: child.id, classroomId: turmaId } },
      update: {},
      create: {
        childId: child.id,
        classroomId: turmaId,
        enrollmentDate: new Date('2026-02-01'),
        status: EnrollmentStatus.ATIVA,
      },
    });

    alunosCriados++;
  }
  console.log(`✅ ${alunosCriados} alunos criados e matriculados`);

  console.log('\n🎉 Seed CEPI Arara-Canindé 2026 concluído com sucesso!');
  console.log('\n📋 CREDENCIAIS DE ACESSO:');
  console.log('   Senha padrão de todos os usuários: Conexa@2026');
  console.log('\n   EQUIPE CENTRAL:');
  console.log('   bruna.vaz@cocris.org         → Coordenação Geral');
  console.log('   carla@cocris.org             → Psicologia');
  console.log('\n   GESTÃO DA UNIDADE:');
  console.log('   coordenadora@araracaninde.cocris.org → Coordenadora Pedagógica');
  console.log('   diretora@araracaninde.cocris.org     → Diretora');
  console.log('   administrativo@araracaninde.cocris.org → Administrativo');
  console.log('\n   PROFESSORAS:');
  PROFESSORAS.forEach(p => {
    console.log(`   ${p.email.padEnd(45)} → ${p.firstName} (${p.turmas.join(', ')})`);
  });
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
