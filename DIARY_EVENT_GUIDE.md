_Gerado por MANUZ, Engenheiro de Software Sênior._

# Guia de Uso: Módulo de Diário de Bordo Pedagógico

**Data:** 03 de Fevereiro de 2026

Este documento detalha como utilizar a API do Módulo de Diário de Bordo Pedagógico do Conexa, incluindo endpoints, regras de acesso e exemplos práticos.

---

## 1. Visão Geral

O Diário de Bordo é o coração do registro pedagógico no Conexa. Ele é baseado em **eventos**, permitindo que os educadores registrem o cotidiano da criança de forma rápida, segura e com valor pedagógico. Cada evento é vinculado a uma criança, uma turma e um autor, com auditoria completa de todas as ações.

## 2. API REST

**URL Base:** `/diary-events`

**Autenticação:** Todas as rotas requerem um `accessToken` JWT válido no header `Authorization: Bearer <token>`.

### 2.1. Criar Evento

**Endpoint:** `POST /diary-events`

Cria um novo evento no diário de bordo. As regras de acesso são validadas automaticamente pelo serviço.

**Body:** `CreateDiaryEventDto`

```json
{
  "type": "ALIMENTACAO",
  "title": "Almoço - Aceitou bem a sopa de legumes",
  "description": "Comeu toda a sopa de legumes e pediu para repetir. Mostrou interesse em experimentar a beterraba.",
  "eventDate": "2026-02-03T12:30:00.000Z",
  "childId": "clx_child_1",
  "classroomId": "clx_classroom_1",
  "tags": ["alimentação", "nutrição", "desenvolvimento"],
  "mediaUrls": ["https://storage.conexa.com/media/foto_almoco_1.jpg"]
}
```

**Exemplo (cURL):**

```bash
curl -X POST http://localhost:3000/diary-events \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ALIMENTACAO",
    "title": "Almoço - Aceitou bem a sopa de legumes",
    "description": "Comeu toda a sopa de legumes e pediu para repetir.",
    "eventDate": "2026-02-03T12:30:00.000Z",
    "childId": "clx_child_1",
    "classroomId": "clx_classroom_1",
    "tags": ["alimentação", "nutrição"]
  }'
```

### 2.2. Listar Eventos

**Endpoint:** `GET /diary-events`

Lista eventos com base no escopo do usuário e em filtros opcionais. O acesso é automaticamente restrito (ex: um professor só verá eventos das suas turmas).

**Query Params:**

-   `childId` (string): Filtrar por ID da criança.
-   `classroomId` (string): Filtrar por ID da turma.
-   `unitId` (string): Filtrar por ID da unidade.
-   `type` (DiaryEventType): Filtrar por tipo de evento.
-   `startDate` (string): Data inicial (ISO 8601).
-   `endDate` (string): Data final (ISO 8601).
-   `createdBy` (string): Filtrar por ID do autor.

**Exemplo (cURL) - Listar todos os eventos de uma criança em um período:**

```bash
curl -G http://localhost:3000/diary-events \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --data-urlencode "childId=clx_child_1" \
  --data-urlencode "startDate=2026-02-01T00:00:00.000Z" \
  --data-urlencode "endDate=2026-02-03T23:59:59.999Z"
```

### 2.3. Buscar Evento por ID

**Endpoint:** `GET /diary-events/:id`

Busca um evento específico por seu ID. O acesso é validado pelo serviço.

**Exemplo (cURL):**

```bash
curl http://localhost:3000/diary-events/clx_event_1 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 2.4. Atualizar Evento

**Endpoint:** `PATCH /diary-events/:id`

Atualiza um evento existente. Apenas o criador do evento ou usuários com nível hierárquico superior (Coordenação, Mantenedora, etc.) podem editar.

**Body:** `UpdateDiaryEventDto` (campos opcionais)

```json
{
  "title": "Almoço - Aceitou muito bem a sopa de legumes e a beterraba",
  "description": "Comeu toda a sopa de legumes e pediu para repetir. Mostrou interesse em experimentar a beterraba e comeu dois pedaços."
}
```

**Exemplo (cURL):**

```bash
curl -X PATCH http://localhost:3000/diary-events/clx_event_1 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Atualização da descrição do evento."
  }'
```

### 2.5. Deletar Evento (Soft Delete)

**Endpoint:** `DELETE /diary-events/:id`

Realiza um "soft delete" do evento, marcando-o como deletado (`deletedAt`). O registro não é removido do banco de dados, garantindo a rastreabilidade. As regras de acesso são as mesmas da atualização.

**Exemplo (cURL):**

```bash
curl -X DELETE http://localhost:3000/diary-events/clx_event_1 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 3. Regras de Acesso

O sistema de acesso é hierárquico e aplicado automaticamente em todas as operações:

| Papel | Acesso para Criar/Ver/Editar/Deletar |
| :--- | :--- |
| **Professor** | Apenas eventos de crianças em **suas turmas** ativas. |
| **Coordenação/Direção** | Todos os eventos da **sua unidade**. |
| **Staff Central** | Todos os eventos das **unidades vinculadas** ao seu perfil. |
| **Mantenedora** | Todos os eventos de **todas as unidades** da mantenedora. |
| **Desenvolvedor** | Acesso total (bypass sistêmico). |

---

## 4. Auditoria

Todas as operações de `CRIAR`, `ATUALIZAR` e `DELETAR` são automaticamente registradas no `AuditLog`. Cada registro de auditoria contém:

-   **Ação:** `CREATE`, `UPDATE`, `DELETE`.
-   **Entidade:** `DiaryEvent`.
-   **ID da Entidade:** ID do evento afetado.
-   **ID do Usuário:** ID do usuário que realizou a ação.
-   **Escopo:** `mantenedoraId` e `unitId`.
-   **Alterações:** Um objeto JSON com os dados `antes` e `depois` da alteração (para `UPDATE`) ou os dados criados/deletados.

Isso garante **100% de rastreabilidade** sobre quem fez o quê, quando e em qual registro.

---

**O Módulo de Diário de Bordo está pronto para uso!** 📝✨
