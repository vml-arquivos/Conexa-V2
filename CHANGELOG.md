# CHANGELOG: Schema Prisma v1.0 → v1.1

**Data:** 03 de Fevereiro de 2026
**Autor:** MANUZ, Arquiteto de Dados

Este documento detalha as alterações realizadas no `schema.prisma` para a versão 1.1, que foi congelada para a primeira migração no Supabase. As mudanças foram baseadas na auditoria de schema e visam aumentar a robustez, a integridade e a flexibilidade do modelo de dados.

---

### 1. Relação Explícita Professor-Turma (Alteração Obrigatória)

-   **O que mudou:**
    -   **Removido:** Campos `mainTeacherId` e `auxiliaryTeacherId` do model `Classroom`.
    -   **Adicionado:** Novo model `ClassroomTeacher` para criar uma tabela de junção N:N entre `Classroom` e `User`.
    -   **Adicionado:** Novo enum `ClassroomTeacherRole` com os valores `MAIN`, `AUXILIARY`, `SUBSTITUTE`.
    -   **Adicionado:** Relações `teachers` em `Classroom` e `classroomTeachers` em `User`.
-   **Por que mudou:**
    -   A abordagem anterior com `String?` era frágil e não garantia a **integridade referencial**. Era possível associar um ID de usuário inexistente a uma turma.
    -   A nova estrutura garante que apenas usuários válidos podem ser associados a turmas e facilita consultas complexas, como "listar todas as turmas de um professor".

### 2. Flexibilização da Requisição de Materiais (Alteração Recomendada)

-   **O que mudou:**
    -   **Adicionado:** Campo `classroomId: String?` opcional no model `MaterialRequest`.
    -   **Adicionado:** Relação opcional `classroom: Classroom?` no model `MaterialRequest`.
-   **Por que mudou:**
    -   Para alinhar o schema com a possibilidade de a requisição de material ser feita tanto a nível de **unidade** (de forma centralizada) quanto a nível de **turma** (de forma específica).
    -   Se `classroomId` for nulo, a requisição é da unidade. Se preenchido, pertence a uma turma específica, aumentando a granularidade do controle de custos.

### 3. Escopo de Acesso Multi-Unidade para Staff Central (Alteração Recomendada)

-   **O que mudou:**
    -   **Removido:** Campo `scopeUnitId` do model `UserRole`.
    -   **Adicionado:** Novo model `UserRoleUnitScope` para criar uma tabela de junção N:N entre `UserRole` e `Unit`.
    -   **Adicionado:** Relação `unitScopes` em `UserRole`.
-   **Por que mudou:**
    -   Para resolver a limitação do `scopeUnitId`, que só permitia associar um papel a uma única unidade. Isso era inadequado para papéis como `STAFF_CENTRAL`, que precisam de acesso a um **conjunto específico de unidades**.
    -   A nova estrutura permite que um papel de usuário (ex: Psicólogo) seja vinculado a várias unidades de forma declarativa no banco de dados, tornando a lógica de permissão mais segura e menos dependente de código complexo na aplicação.

### 4. Adoção do Tipo `Json` (Hardening)

-   **O que mudou:**
    -   Campos que armazenavam dados estruturados como `String` foram alterados para o tipo `Json` nativo do Prisma. Isso afeta:
        -   `PlanningTemplate.sections`
        -   `PlanningTemplate.fields`
        -   `Planning.activities`
        -   `Planning.resources`
        -   `Planning.bnccAreas`
        -   `DiaryEvent.tags`
        -   `DiaryEvent.aiContext`
        -   `DiaryEvent.mediaUrls`
        -   `AuditLog.changes`
        -   `ReportBase.developmentSummary`
        -   `AIContext.recentEvents`, `trends`, `suggestedActions`
-   **Por que mudou:**
    -   Utilizar o tipo `Json` se traduz no tipo `jsonb` no PostgreSQL, que é otimizado para indexação e consulta de dados semi-estruturados.
    -   Embora a normalização completa (ex: tabela `Tag`) tenha sido adiada para a v2, esta mudança já melhora a performance e a capacidade de consulta em comparação com o armazenamento em `TEXT`.

### 5. Hardening Geral e Validação

-   **O que mudou:**
    -   **Índices:** Foram revisados e adicionados índices (`@@index`) em todas as chaves estrangeiras e campos frequentemente usados em filtros (`status`, `type`, `date`, etc.) para garantir a performance das consultas.
    -   **Relações Inversas:** Foram adicionadas todas as relações inversas que o `prisma format` apontou como ausentes, garantindo a consistência do schema.
    -   **Opcionalidade:** Corrigida a opcionalidade de campos de relação (ex: `createdByUser` agora é `User?`) para refletir a opcionalidade da chave estrangeira, resolvendo erros de validação do Prisma.
-   **Por que mudou:**
    -   Para preparar o schema para um ambiente de produção, garantindo que ele seja não apenas sintaticamente válido, mas também performático e robusto.
