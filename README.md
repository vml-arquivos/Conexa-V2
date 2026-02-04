
# Conexa - Plataforma de Gestão Educacional

## 1. Visão do Projeto

O **Conexa** é uma plataforma SaaS (_Software as a Service_) de gestão educacional, pedagógica e operacional, desenhada especificamente para o nicho de **instituições de educação infantil** que atendem crianças de 0 a 4 anos. 

Nossa visão é criar um ecossistema digital integrado que centraliza a administração, otimiza a comunicação e, acima de tudo, potencializa o desenvolvimento pedagógico. A plataforma foi concebida para ser a base de um sistema exemplar: **escalável, auditável, humano-centrista e tecnicamente impecável**.

O sistema nasce com suporte nativo a múltiplas unidades (multi-tenancy), uma hierarquia de acesso rigorosa baseada em papéis (RBAC), e ferramentas essenciais como o diário de bordo pedagógico, a geração de relatórios oficiais (RIA/RDIC – DF) e uma arquitetura preparada para a integração com agentes de Inteligência Artificial como ferramentas de suporte ao educador.

## 2. Princípios Fundamentais

O desenvolvimento do Conexa é guiado por princípios não negociáveis que garantem a segurança, a integridade e a qualidade do sistema.

| Princípio | Descrição |
| :--- | :--- |
| **Multi-tenancy na Raiz** | A arquitetura é projetada desde o início para isolar os dados de diferentes mantenedoras e suas respectivas unidades, garantindo segurança e privacidade. |
| **IA como Suporte** | A Inteligência Artificial será usada exclusivamente para apoiar decisões, automatizar tarefas repetitivas e fornecer insights. Nenhuma ação crítica é tomada sem a validação de um profissional (`human-in-the-loop`). |
| **Backend-Driven** | Toda a lógica de negócio, regras de validação e controle de acesso residem no backend. O frontend é responsável apenas pela apresentação da interface. |
| **Conformidade Regulatória** | O sistema seguirá as diretrizes da Base Nacional Comum Curricular (BNCC) e do Currículo em Movimento do Distrito Federal, facilitando a geração de relatórios oficiais. |
| **Segurança de Dados Sensíveis** | A proteção dos dados das crianças é a prioridade máxima. Implementamos controles de acesso rigorosos e práticas de segurança robustas para garantir a confidencialidade e integridade das informações. |

## 3. Stack Técnica

A escolha da stack foi feita para garantir performance, escalabilidade e uma excelente experiência de desenvolvimento, utilizando tecnologias modernas e consolidadas no mercado.

| Componente | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Backend** | Node.js + NestJS | Framework robusto, opinativo e escalável que organiza o código de forma modular e facilita a implementação de padrões como injeção de dependência. |
| **ORM** | Prisma | ORM de próxima geração que oferece segurança de tipos, autocompletar e uma API intuitiva para interagir com o banco de dados de forma segura e eficiente. |
| **Banco de Dados** | PostgreSQL (via Supabase) | Banco de dados relacional open-source poderoso, confiável e extensível, ideal para modelar as complexas relações de um sistema educacional. |
| **Autenticação** | JWT + RBAC | Autenticação baseada em tokens (JSON Web Tokens) combinada com um Controle de Acesso Baseado em Papéis (Role-Based Access Control) para garantir a segurança. |
| **Infraestrutura** | Docker + Coolify (GCP) | Conteinerização com Docker para garantir a portabilidade e consistência dos ambientes, com deploy automatizado em uma VPS na Google Cloud Platform. |
| **Inteligência Artificial** | Agentes Externos (OpenAI/Compatível) | Integração com modelos de linguagem avançados para tarefas de suporte, como sumarização de textos e sugestão de atividades. |

## 4. Estrutura Inicial do Projeto

A primeira entrega se concentra na fundação do sistema: o banco de dados e a documentação inicial. Nenhum outro código de aplicação (controllers, services, UI) foi criado nesta fase.

```
/conexa-v2
├── prisma/
│   └── schema.prisma   # Define todo o schema do banco de dados
└── README.md           # Este arquivo
```

- **`prisma/schema.prisma`**: Arquivo central que descreve todas as tabelas, colunas, relações, enums e regras do banco de dados. Ele serve como a "fonte da verdade" para a estrutura de dados do Conexa.
- **`README.md`**: Documento que introduz a visão, os princípios, a stack e a estrutura do projeto, servindo como guia para todos os desenvolvedores e stakeholders.


## 5. Autenticação e Controle de Acesso (RBAC)

A segurança do Conexa é implementada através de um sistema robusto de autenticação baseada em JWT e um controle de acesso granular (RBAC) que respeita a hierarquia multi-tenant.

### Fluxo de Autenticação

1.  **Login**: O usuário envia `email` e `senha` para a rota `POST /auth/login`.
2.  **Validação**: O `AuthService` valida as credenciais e o status do usuário.
3.  **Geração de Tokens**: Se as credenciais estiverem corretas, são gerados dois tokens JWT:
    *   `accessToken`: Token de curta duração (ex: 15 minutos) usado para autorizar o acesso às rotas protegidas.
    *   `refreshToken`: Token de longa duração (ex: 7 dias) usado para renovar o `accessToken` sem exigir que o usuário faça login novamente.
4.  **Renovação**: Quando o `accessToken` expira, o frontend envia o `refreshToken` para a rota `POST /auth/refresh` para obter um novo `accessToken`.

### Estrutura de Controle de Acesso (Guards)

O controle de acesso é aplicado globalmente através de uma série de Guards do NestJS, que são executados em cada requisição:

1.  **`JwtAuthGuard` (Global)**: Verifica a validade do `accessToken` em todas as rotas, exceto as marcadas com o decorator `@Public()`.
2.  **`RolesGuard`**: Valida se o usuário possui o `RoleLevel` (nível de acesso) necessário para acessar a rota, definido pelo decorator `@RequireRoles()`.
3.  **`PermissionsGuard`**: Valida se o usuário possui as permissões específicas (ex: `children:read`) para acessar a rota, definidas pelo decorator `@RequirePermissions()`.
4.  **`ScopeGuard`**: Valida se o usuário tem permissão para acessar os dados daquele escopo (mantenedora, unidade, turma), verificando os parâmetros da rota.

### Exemplo de Uso em uma Rota Protegida

O exemplo abaixo mostra como proteger uma rota que só pode ser acessada por um usuário com o nível `UNIDADE`, com a permissão `planning:read`, e que está tentando acessar dados da sua própria unidade.

```typescript
// GET /unidade/:unitId/plannings

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, ScopeGuard)
@RequireRoles(RoleLevel.UNIDADE)
@RequirePermissions("planning:read")
@Get("unidade/:unitId/plannings")
getUnitPlannings(
  @Param("unitId") unitId: string,
  @CurrentUser() user: JwtPayload,
) {
  // A lógica do controller só é executada se todos os guards passarem.
  // O ScopeGuard já validou que o usuário logado tem acesso à `unitId` do parâmetro.
  return this.planningService.findAllByUnit(unitId);
}
```

Esta abordagem garante que a segurança é declarativa, centralizada e fácil de auditar, prevenindo vazamento de dados entre tenants e garantindo que cada usuário acesse apenas o que lhe é permitido.


## 6. Módulo de Diário de Bordo Pedagógico

O núcleo do Conexa é o Diário de Bordo, implementado através do `DiaryEventModule`. Ele permite o registro de eventos pedagógicos individuais para cada criança, com segurança e rastreabilidade.

### Funcionalidades

- **CRUD Completo**: `CRIAR`, `LER`, `ATUALIZAR` e `DELETAR` (soft delete) eventos.
- **API REST**: Endpoints em `/diary-events` com filtros por criança, turma e período.
- **Regras de Acesso**: Validação de escopo multi-tenant em todas as operações.
- **Auditoria Automática**: Todas as mudanças são registradas no `AuditLog`.

Para mais detalhes, consulte o `DIARY_EVENT_GUIDE.md`.


## 7. Módulo de Planejamento Pedagógico

Este módulo estrutura o planejamento pedagógico, fechando o ciclo **Planejamento → Execução → Registro**.

### Funcionalidades

- **Planning Templates**: Modelos reutilizáveis (ANUAL, MENSAL, SEMANAL) criados pela Mantenedora ou Coordenação Geral.
- **Plannings**: Instâncias de planejamento aplicadas a uma turma em um período específico.
- **Regras de Acesso**: Validação de escopo e permissões por nível hierárquico.
- **Auditoria Completa**: Todas as operações são registradas no `AuditLog`.
- **Integração com Diário de Bordo**: Eventos podem ser vinculados a planejamentos.

Para mais detalhes, consulte o `PLANNING_GUIDE.md`.


## 8. Módulo de Planejamento Pedagógico v2 (Orientado por Matriz)

Este módulo implementa a arquitetura pedagógica orientada pela Matriz Curricular, garantindo fidelidade normativa e autonomia docente.

- **CurriculumMatrixModule**: Gerencia as matrizes curriculares anuais.
- **CurriculumMatrixEntryModule**: Gerencia as entradas diárias da matriz (objetivos).
- **PlanningModule**: Cria planejamentos mensais e semanais derivados da matriz.
- **DiaryEventModule**: Vincula os eventos diários aos planejamentos e às entradas da matriz.

Consulte `PLANNING_GUIDE_V2.md` para exemplos de uso da API.

## 9. Importação da Matriz Curricular

O sistema permite a importação da Matriz Curricular a partir de um arquivo PDF.

### 9.1 Dry-run (Simulação)

Simula a importação sem gravar no banco.

**Endpoint:** `POST /curriculum-matrices/import/dry-run`

**RBAC:** `MANTENEDORA`, `STAFF_CENTRAL`

**Exemplo cURL:**

```bash
curl -X POST http://localhost:3000/curriculum-matrices/import/dry-run \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mantenedoraId": "ID_MANTENEDORA",
    "year": 2026,
    "segment": "EI02",
    "version": 1,
    "sourceUrl": "/path/to/your/pdf/file.pdf",
    "mode": "DRY_RUN"
  }'
```

### 9.2 Apply (Importação Real)

Importa a matriz curricular para o banco.

**Endpoint:** `POST /curriculum-matrices/:id/import/pdf`

**RBAC:** `MANTENEDORA`, `STAFF_CENTRAL`

**Exemplo cURL:**

```bash
curl -X POST http://localhost:3000/curriculum-matrices/ID_DA_MATRIZ/import/pdf \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceUrl": "/path/to/your/pdf/file.pdf",
    "mode": "APPLY",
    "force": false
  }'
```
```
```


## 10. Supabase / Migrações

Esta seção descreve como preparar e aplicar as migrações do banco de dados no Supabase.

### 1. Configurar `DATABASE_URL`

Crie um arquivo `.env` na raiz do projeto e adicione a variável de ambiente `DATABASE_URL`.

O Supabase fornece a URL de conexão direta ao seu banco de dados PostgreSQL. Você pode encontrá-la em:

**Project Settings > Database > Connection string**

Copie a URL e cole no seu arquivo `.env`:

```bash
# .env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"
```

**⚠️ IMPORTANTE:** Nunca comite o arquivo `.env` no Git. Use variáveis de ambiente no seu ambiente de produção.

### 2. Fluxos de Migração

#### Fluxo A: Desenvolvimento Local

Use este fluxo para criar novas migrações e testar localmente.

**Passo 1: Validar o Schema**

```bash
npx prisma validate
```

**Passo 2: Gerar o Prisma Client**

```bash
npm run prisma:generate
```

**Passo 3: Criar e Aplicar a Migração**

Este comando cria um novo arquivo de migração e o aplica ao seu banco de dados local.

```bash
npm run db:migrate:dev -- --name sua-nova-feature
```

#### Fluxo B: Produção / Supabase

Use este fluxo para aplicar migrações existentes em um ambiente de produção.

**Passo 1: Validar o Schema**

```bash
npx prisma validate
```

**Passo 2: Gerar o Prisma Client**

```bash
npm run prisma:generate
```

**Passo 3: Aplicar as Migrações**

```bash
npm run db:migrate:deploy
```

**Passo 4: Verificar o Status**

```bash
npm run db:status
```

**Exemplo de saída esperada:**

```
Database schema is up to date!

1 migration found in prisma/migrations

- 20260203000000_initial_setup
```

**⚠️ IMPORTANTE:**

- **NUNCA** use `npm run db:migrate:dev` em produção. Este comando pode resetar o banco de dados.
- Use `npm run db:migrate:deploy` para aplicar migrações de forma segura.
