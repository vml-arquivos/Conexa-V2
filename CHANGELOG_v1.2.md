# CHANGELOG: Schema Prisma v1.1 → v1.2

**Data:** 03 de Fevereiro de 2026

**Autor:** MANUZ, Arquiteto de Dados

Esta atualização do schema implementa a **Arquitetura Pedagógica Orientada por Matriz Curricular**, introduzindo uma estrutura normativa para garantir a fidelidade do planejamento pedagógico e preparando o sistema para análises de IA mais seguras e eficazes.

---

## 1. Novos Models

### 1.1. `CurriculumMatrix`

-   **Justificativa:** Armazenar e versionar as Matrizes Curriculares anuais como uma entidade de primeira classe. Isso permite que a Mantenedora gerencie a base normativa do planejamento de forma centralizada e auditável.
-   **Estrutura:**
    -   `name`, `year`, `segment`, `version`: Identificam unicamente uma matriz.
    -   `mantenedoraId`: Garante o isolamento multi-tenant.
    -   `isActive`: Permite ativar ou desativar uma matriz para uso.

### 1.2. `CurriculumMatrixEntry`

-   **Justificativa:** Representar cada linha da matriz curricular, servindo como a "fonte da verdade" para os objetivos de cada dia letivo. Isso torna os objetivos curriculares dados imutáveis e consultáveis, em vez de texto livre.
-   **Estrutura:**
    -   `matrixId`: Vínculo com a `CurriculumMatrix`.
    -   `date`, `weekOfYear`, `dayOfWeek`: Organização temporal precisa.
    -   `campoDeExperiencia`, `objetivoBNCC`, `objetivoCurriculo`: Campos normativos imutáveis.
    -   `intencionalidade`, `exemploAtividade`: Sugestões pedagógicas que podem ser usadas como base para o professor.

---

## 2. Models Ajustados

### 2.1. `Planning`

-   **Justificativa:** Adaptar o planejamento para ser derivado da Matriz Curricular, separando o que é normativo do que é autoral.
-   **Alterações:**
    -   **Adicionado `curriculumMatrixId` (opcional):** Cria um vínculo explícito com a matriz que orienta o planejamento.
    -   **Adicionado `pedagogicalContent` (Json?):** Novo campo para o professor inserir suas contribuições autorais (experiências, materiais, estratégias), mantendo os objetivos separados e imutáveis.
    -   **Campos antigos mantidos (`objectives`, `activities`, etc.):** Para garantir a retrocompatibilidade com dados existentes, os campos antigos foram mantidos, mas o novo fluxo de negócio irá priorizar o uso de `pedagogicalContent`.

### 2.2. `DiaryEvent`

-   **Justificativa:** Fortalecer o vínculo entre o registro diário e a estrutura curricular, permitindo uma rastreabilidade pedagógica completa.
-   **Alterações:**
    -   **Adicionado `curriculumEntryId` (opcional):** Vínculo direto com a entrada da matriz do dia, permitindo saber exatamente quais objetivos estavam planejados para o momento do evento.
    -   **Adicionado `eventDate` (DateTime):** Campo de data do evento se torna obrigatório para garantir a correta associação com a `CurriculumMatrixEntry` do dia.

---

## 3. Novos Enums

### 3.1. `CampoDeExperiencia`

-   **Justificativa:** Tipar o campo `campoDeExperiencia` em `CurriculumMatrixEntry` com os 5 campos de experiência oficiais da BNCC, garantindo consistência e evitando erros de digitação.
-   **Valores:** `O_EU_O_OUTRO_E_O_NOS`, `CORPO_GESTOS_E_MOVIMENTOS`, etc.

---

## 4. Impacto e Compatibilidade

-   **Não há quebras de compatibilidade críticas (No Breaking Changes):** Todos os novos campos de relacionamento (`curriculumMatrixId`, `curriculumEntryId`) são opcionais (`?`) para não invalidar os registros existentes que não os possuem.
-   **Retrocompatibilidade:** Os campos antigos em `Planning` foram mantidos, garantindo que a API v1 continue funcionando com dados legados.
-   **Estratégia de Migração:** Uma migração de dados futura poderá ser executada para preencher os novos campos em registros antigos, se necessário, mas o sistema pode operar em um modo de compatibilidade.

Esta atualização representa um grande avanço na maturidade pedagógica e técnica do Conexa, transformando o planejamento em um processo mais estruturado, auditável e inteligente.
