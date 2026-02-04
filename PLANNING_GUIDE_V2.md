## Guia de Uso: Módulo de Planejamento Pedagógico v2 (Orientado por Matriz)

Este guia detalha como usar as novas APIs para gerenciar a Matriz Curricular e criar planejamentos alinhados.

### 1. Gerenciamento da Matriz Curricular (Admin)

#### 1.1. Criar uma Matriz Curricular

**Endpoint:** `POST /curriculum-matrices`

**Permissão:** `MANTENEDORA`, `STAFF_CENTRAL`

```bash
curl -X POST http://localhost:3000/curriculum-matrices \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Matriz Curricular 2026 - Berçário II",
    "year": 2026,
    "segment": "EI02",
    "description": "Matriz piloto para o ano de 2026, segmento Berçário II."
  }'
```

#### 1.2. Adicionar Entradas à Matriz

**Endpoint:** `POST /curriculum-matrix-entries`

**Permissão:** `MANTENEDORA`, `STAFF_CENTRAL`

```bash
curl -X POST http://localhost:3000/curriculum-matrix-entries \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matrixId": "ID_DA_MATRIZ_CRIADA",
    "date": "2026-02-03T00:00:00.000Z",
    "weekOfYear": 6,
    "dayOfWeek": 2,
    "campoDeExperiencia": "O_EU_O_OUTRO_E_O_NOS",
    "objetivoBNCC": "(EI02EO01) Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.",
    "objetivoBNCCCode": "EI02EO01",
    "objetivoCurriculo": "Interagir com crianças da mesma faixa etária e com adultos, expressando seus desejos, necessidades e sentimentos.",
    "intencionalidade": "Promover a interação e o respeito mútuo."
  }'
```

### 2. Criação de Planejamentos (Coordenação/Direção)

#### 2.1. Criar um Planejamento Semanal

**Endpoint:** `POST /plannings`

**Permissão:** `UNIDADE_COORDENADOR_PEDAGOGICO`, `UNIDADE_DIRETOR`

```bash
curl -X POST http://localhost:3000/plannings \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Planejamento Semanal - Semana 6",
    "type": "SEMANAL",
    "classroomId": "ID_DA_TURMA",
    "curriculumMatrixId": "ID_DA_MATRIZ_2026",
    "startDate": "2026-02-02T00:00:00.000Z",
    "endDate": "2026-02-06T23:59:59.999Z",
    "pedagogicalContent": {
      "2026-02-03": {
        "experience": "Roda de conversa sobre as famílias, com fotos trazidas de casa.",
        "materials": ["Fotos das famílias", "Almofadas"],
        "strategy": "Sentar em círculo e incentivar cada criança a falar sobre sua foto."
      }
    }
  }'
```

### 3. Registro de Eventos (Professor)

#### 3.1. Criar um Evento Vinculado ao Planejamento e à Matriz

**Endpoint:** `POST /diary-events`

**Permissão:** `PROFESSOR`

```bash
curl -X POST http://localhost:3000/diary-events \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ATIVIDADE_PEDAGOGICA",
    "title": "Roda de Conversa - Famílias",
    "description": "Maria mostrou a foto do seu irmão e sorriu.",
    "eventDate": "2026-02-03T10:00:00.000Z",
    "childId": "ID_DA_CRIANCA",
    "classroomId": "ID_DA_TURMA",
    "planningId": "ID_DO_PLANEJAMENTO_SEMANAL",
    "curriculumEntryId": "ID_DA_ENTRADA_DA_MATRIZ_DO_DIA_03_02"
  }'
```
