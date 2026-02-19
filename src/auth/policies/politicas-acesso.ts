/**
 * Políticas de Acesso Unificadas — Conexa V2
 * PR-UNICO-SUPER-SAAS-2026-014 / Etapa 2
 *
 * Este módulo centraliza todas as regras de autorização do sistema,
 * garantindo consistência entre controllers, services e guards.
 *
 * Hierarquia de acesso (do mais amplo ao mais restrito):
 *   DEVELOPER > MANTENEDORA > STAFF_CENTRAL > UNIDADE > PROFESSOR
 *
 * Regra de Ouro:
 *   STAFF_CENTRAL (Bruna/Carla) = READ GLOBAL + relatórios; SEM CRUD operacional.
 *   UNIDADE = CRUD operacional na própria unidade.
 *   PROFESSOR = edita apenas o próprio conteúdo nas turmas vinculadas.
 */

import { ForbiddenException } from '@nestjs/common';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Funções de verificação (retornam boolean — não lançam exceção)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se o usuário pode ACESSAR (leitura) dados de uma unidade específica.
 *
 * - DEVELOPER: sempre sim
 * - MANTENEDORA: sim se a unidade pertencer à mesma mantenedora
 * - STAFF_CENTRAL: sim se unitId ∈ unitScopes do token
 * - UNIDADE: sim se unitId == user.unitId
 * - PROFESSOR: não (usa acesso por turma)
 */
export function podeAcessarUnidade(user: JwtPayload, unitId: string): boolean {
  if (!unitId) return false;

  // DEVELOPER tem acesso total
  if (user.roles.some((r) => r.level === RoleLevel.DEVELOPER)) return true;

  // MANTENEDORA acessa todas as unidades da própria mantenedora
  if (user.roles.some((r) => r.level === RoleLevel.MANTENEDORA)) return true;

  // STAFF_CENTRAL acessa unidades no seu escopo
  const staffRole = user.roles.find((r) => r.level === RoleLevel.STAFF_CENTRAL);
  if (staffRole) {
    return (staffRole.unitScopes ?? []).includes(unitId);
  }

  // UNIDADE acessa apenas a própria unidade
  if (user.roles.some((r) => r.level === RoleLevel.UNIDADE)) {
    return user.unitId === unitId;
  }

  // PROFESSOR não acessa por unitId diretamente
  return false;
}

/**
 * Verifica se o usuário pode EDITAR (criar/atualizar/deletar) dados operacionais
 * de uma unidade específica.
 *
 * STAFF_CENTRAL é explicitamente bloqueado (somente leitura).
 */
export function podeEditarOperacional(user: JwtPayload, unitId: string): boolean {
  // DEVELOPER tem acesso total
  if (user.roles.some((r) => r.level === RoleLevel.DEVELOPER)) return true;

  // MANTENEDORA pode editar qualquer unidade da própria mantenedora
  if (user.roles.some((r) => r.level === RoleLevel.MANTENEDORA)) return true;

  // STAFF_CENTRAL: BLOQUEADO para operações de escrita
  if (user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL)) return false;

  // UNIDADE pode editar apenas a própria unidade
  if (user.roles.some((r) => r.level === RoleLevel.UNIDADE)) {
    return user.unitId === unitId;
  }

  // PROFESSOR não pode editar operacional
  return false;
}

/**
 * Verifica se o usuário pode EDITAR conteúdo de autoria própria.
 * Usado para planejamentos, diário de bordo, etc.
 *
 * - DEVELOPER: sempre sim
 * - MANTENEDORA / STAFF_CENTRAL: não (apenas leitura)
 * - UNIDADE: sim (pode editar conteúdo da unidade)
 * - PROFESSOR: sim apenas se for o autor
 */
export function podeEditarConteudoAutor(
  user: JwtPayload,
  autorId: string,
): boolean {
  // DEVELOPER tem acesso total
  if (user.roles.some((r) => r.level === RoleLevel.DEVELOPER)) return true;

  // STAFF_CENTRAL não edita conteúdo de professor
  if (user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL)) return false;

  // MANTENEDORA não edita conteúdo operacional
  if (user.roles.some((r) => r.level === RoleLevel.MANTENEDORA)) return false;

  // UNIDADE pode editar conteúdo da unidade
  if (user.roles.some((r) => r.level === RoleLevel.UNIDADE)) return true;

  // PROFESSOR só edita o próprio conteúdo
  if (user.roles.some((r) => r.level === RoleLevel.PROFESSOR)) {
    return user.sub === autorId;
  }

  return false;
}

/**
 * Verifica se o usuário tem perfil de somente leitura (Central/Mantenedora).
 * Útil para bloquear mutações em controllers.
 */
export function eSomenteLeitor(user: JwtPayload): boolean {
  if (user.roles.some((r) => r.level === RoleLevel.DEVELOPER)) return false;
  if (user.roles.some((r) => r.level === RoleLevel.MANTENEDORA)) return false;
  return user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Funções de guarda (lançam ForbiddenException se não autorizado)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Garante que o usuário pode acessar a unidade.
 * Lança ForbiddenException se não autorizado.
 */
export function garantirAcessoUnidade(user: JwtPayload, unitId: string): void {
  if (!podeAcessarUnidade(user, unitId)) {
    throw new ForbiddenException(
      'Acesso negado: você não tem permissão para acessar esta unidade.',
    );
  }
}

/**
 * Garante que o usuário pode editar operacional da unidade.
 * Lança ForbiddenException se não autorizado (inclui STAFF_CENTRAL).
 */
export function garantirEdicaoOperacional(user: JwtPayload, unitId: string): void {
  if (!podeEditarOperacional(user, unitId)) {
    if (eSomenteLeitor(user)) {
      throw new ForbiddenException(
        'Acesso negado: usuários da Central têm apenas permissão de leitura.',
      );
    }
    throw new ForbiddenException(
      'Acesso negado: você não tem permissão para editar dados desta unidade.',
    );
  }
}

/**
 * Garante que o usuário pode editar o conteúdo de autoria.
 * Lança ForbiddenException se não autorizado.
 */
export function garantirEdicaoConteudo(
  user: JwtPayload,
  autorId: string,
): void {
  if (!podeEditarConteudoAutor(user, autorId)) {
    throw new ForbiddenException(
      'Acesso negado: você não tem permissão para editar este conteúdo.',
    );
  }
}

/**
 * Garante que o usuário NÃO é somente leitura.
 * Lança ForbiddenException para STAFF_CENTRAL em operações de escrita.
 */
export function garantirNaoSomenteLeitor(user: JwtPayload): void {
  if (eSomenteLeitor(user)) {
    throw new ForbiddenException(
      'Acesso negado: usuários da Central têm apenas permissão de leitura.',
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Helper para where clause de escopo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o filtro Prisma de escopo para consultas de unidade.
 * Centraliza a lógica de filtragem por mantenedora/unidade.
 */
export function escopoUnidadeWhere(user: JwtPayload): Record<string, unknown> {
  // DEVELOPER: sem filtro
  if (user.roles.some((r) => r.level === RoleLevel.DEVELOPER)) return {};

  // MANTENEDORA: filtra por mantenedora
  if (user.roles.some((r) => r.level === RoleLevel.MANTENEDORA)) {
    return { mantenedoraId: user.mantenedoraId };
  }

  // STAFF_CENTRAL: filtra por unidades no escopo
  const staffRole = user.roles.find((r) => r.level === RoleLevel.STAFF_CENTRAL);
  if (staffRole) {
    return {
      mantenedoraId: user.mantenedoraId,
      id: { in: staffRole.unitScopes ?? [] },
    };
  }

  // UNIDADE: filtra pela própria unidade
  if (user.roles.some((r) => r.level === RoleLevel.UNIDADE)) {
    return {
      mantenedoraId: user.mantenedoraId,
      id: user.unitId,
    };
  }

  // PROFESSOR: sem acesso direto a unidades
  return { id: 'ACESSO_NEGADO' };
}
