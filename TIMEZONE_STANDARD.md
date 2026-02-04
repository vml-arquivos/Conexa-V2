## Padrão de Timezone - Conexa

### 1. Fuso Horário Pedagógico

- **Variável de Ambiente:** `APP_TIMEZONE`
- **Valor Padrão:** `America/Sao_Paulo`

Todas as regras de negócio que dependem do conceito de "dia" (dia letivo, data do evento, período do planejamento) **DEVEM** usar este fuso horário para garantir consistência.

### 2. Utilitários de Data

- **Localização:** `src/common/utils/date.utils.ts`

#### `getPedagogicalDay(date: Date): string`

- **Função:** Extrai o "dia pedagógico" (YYYY-MM-DD) de uma data, convertendo-a para o `APP_TIMEZONE`.
- **Exemplo:** Uma data em UTC `2026-02-04T02:00:00Z` será convertida para `2026-02-03` em São Paulo.

#### `isSamePedagogicalDay(date1: Date, date2: Date): boolean`

- **Função:** Compara se duas datas correspondem ao mesmo "dia pedagógico".
- **Uso:** Substitui `date1.toDateString() === date2.toDateString()` para evitar bugs de fuso horário.

#### `formatPedagogicalDate(date: Date): string`

- **Função:** Formata uma data para exibição no formato brasileiro (DD/MM/YYYY) no `APP_TIMEZONE`.

### 3. Implementação

- **`DiaryEventService.create()`:** A validação de correspondência entre `eventDate` e `entry.date` foi atualizada para usar `isSamePedagogicalDay()`.

**Antes:**
```typescript
if (eventDate.toDateString() !== entryDate.toDateString()) { ... }
```

**Depois:**
```typescript
if (!isSamePedagogicalDay(eventDate, entryDate)) { ... }
```

### 4. Conclusão

Com esta padronização, o sistema garante que um evento registrado às 23:00 em São Paulo seja corretamente associado a uma entrada da matriz do mesmo dia, mesmo que em UTC já seja o dia seguinte. Isso elimina uma classe inteira de bugs de fuso horário e garante a integridade das regras de negócio pedagógicas.
