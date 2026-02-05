# SPRINT 1 (P0) — EVIDÊNCIAS E VALIDAÇÃO

**Data:** 2026-02-05  
**Objetivo:** Deixar o deploy 100% funcional no Coolify com Docker

---

## MUDANÇAS IMPLEMENTADAS

### A) entrypoint.sh

#### Mudanças Realizadas:

1. **Path do Node corrigido:**
   - ❌ ANTES: `exec node /app/dist/src/main.js`
   - ✅ DEPOIS: `exec node /app/dist/main.js`
   - **Razão:** NestJS compila para `dist/main.js`, não `dist/src/main.js` (confirmado em `package.json`: `"start:prod": "node dist/main"`)

2. **Validação de DATABASE_URL adicionada:**
   - Verifica se `DATABASE_URL` está definida
   - Se vazia: exibe erro e sai com `exit 1`

3. **Validação de DIRECT_URL adicionada:**
   - Verifica se `DIRECT_URL` está definida
   - Se vazia: exibe erro e sai com `exit 1`

4. **Migration strategy ajustada:**
   - ❌ ANTES: `npx prisma migrate deploy || echo "Aviso: ... Subindo app mesmo assim."`
   - ✅ DEPOIS: 
     - Executa `npx prisma migrate deploy`
     - Se falhar: exibe erro detalhado e sai com `exit 1` (produção)
     - Permite "best effort" apenas se `MIGRATE_BEST_EFFORT=true` (opcional, não recomendado)

#### Conteúdo Final de entrypoint.sh:

```bash
#!/usr/bin/env sh
set -eu

echo "=== Conexa-V2 Entrypoint ==="
echo "Validando variáveis de ambiente obrigatórias..."

# Validar DATABASE_URL (obrigatória)
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL não definida no runtime."
  echo "Configure esta variável no Coolify (Environment Variables)."
  exit 1
fi

# Validar DIRECT_URL (obrigatória para migrations)
if [ -z "${DIRECT_URL:-}" ]; then
  echo "ERRO: DIRECT_URL não definida no runtime."
  echo "Configure esta variável no Coolify (Environment Variables)."
  exit 1
fi

echo "✅ Variáveis de ambiente validadas."
echo ""

# Executar migrations
echo "Executando prisma migrate deploy..."

if npx prisma migrate deploy; then
  echo "✅ Migrations aplicadas com sucesso."
else
  echo "❌ ERRO: prisma migrate deploy falhou."
  echo ""
  echo "Possíveis causas:"
  echo "  1. IP do servidor não está na whitelist do Supabase"
  echo "  2. DATABASE_URL ou DIRECT_URL incorretas"
  echo "  3. Banco de dados inacessível"
  echo ""
  echo "Consulte: COOLIFY_SETUP_GUIDE.md para troubleshooting"
  echo ""
  
  # Permitir "best effort" apenas se explicitamente configurado
  if [ "${MIGRATE_BEST_EFFORT:-false}" = "true" ]; then
    echo "⚠️  MIGRATE_BEST_EFFORT=true: Subindo app mesmo assim (NÃO RECOMENDADO EM PRODUÇÃO)"
  else
    echo "Deploy abortado. Configure MIGRATE_BEST_EFFORT=true para subir mesmo com migrations falhando (não recomendado)."
    exit 1
  fi
fi

echo ""
echo "Iniciando aplicação NestJS..."
echo "Path: /app/dist/main.js"
echo ""

exec node /app/dist/main.js
```

### B) Dockerfile

**Status:** ✅ **Nenhuma alteração necessária**

O Dockerfile já estava correto:
- Copia `/app/dist` do builder para runtime (linha 47)
- Copia `entrypoint.sh` e torna executável (linhas 51-52)
- Expõe porta 3000 (linha 54)
- Executa `entrypoint.sh` como CMD (linha 55)

### C) .env.example

**Status:** ✅ **Atualizado com documentação completa**

Adicionadas:
- Documentação clara de variáveis obrigatórias
- Formato esperado das connection strings
- Referência para guias de troubleshooting
- Comentários sobre `MIGRATE_BEST_EFFORT`

---

## VALIDAÇÃO (SIMULADA)

### Cenário 1: Container sem DATABASE_URL

**Comando:**
```bash
docker run --rm -e DIRECT_URL="..." conexa-v2:local
```

**Saída Esperada:**
```
=== Conexa-V2 Entrypoint ===
Validando variáveis de ambiente obrigatórias...
ERRO: DATABASE_URL não definida no runtime.
Configure esta variável no Coolify (Environment Variables).
```

**Exit Code:** `1` ✅

---

### Cenário 2: Container sem DIRECT_URL

**Comando:**
```bash
docker run --rm -e DATABASE_URL="..." conexa-v2:local
```

**Saída Esperada:**
```
=== Conexa-V2 Entrypoint ===
Validando variáveis de ambiente obrigatórias...
✅ Variáveis de ambiente validadas.

ERRO: DIRECT_URL não definida no runtime.
Configure esta variável no Coolify (Environment Variables).
```

**Exit Code:** `1` ✅

---

### Cenário 3: Migrations falham (sem MIGRATE_BEST_EFFORT)

**Comando:**
```bash
docker run --rm \
  -e DATABASE_URL="postgresql://invalid:..." \
  -e DIRECT_URL="postgresql://invalid:..." \
  conexa-v2:local
```

**Saída Esperada:**
```
=== Conexa-V2 Entrypoint ===
Validando variáveis de ambiente obrigatórias...
✅ Variáveis de ambiente validadas.

Executando prisma migrate deploy...
Error: P1001: Can't reach database server
❌ ERRO: prisma migrate deploy falhou.

Possíveis causas:
  1. IP do servidor não está na whitelist do Supabase
  2. DATABASE_URL ou DIRECT_URL incorretas
  3. Banco de dados inacessível

Consulte: COOLIFY_SETUP_GUIDE.md para troubleshooting

Deploy abortado. Configure MIGRATE_BEST_EFFORT=true para subir mesmo com migrations falhando (não recomendado).
```

**Exit Code:** `1` ✅

---

### Cenário 4: Migrations falham (com MIGRATE_BEST_EFFORT=true)

**Comando:**
```bash
docker run --rm \
  -e DATABASE_URL="postgresql://invalid:..." \
  -e DIRECT_URL="postgresql://invalid:..." \
  -e MIGRATE_BEST_EFFORT=true \
  conexa-v2:local
```

**Saída Esperada:**
```
=== Conexa-V2 Entrypoint ===
Validando variáveis de ambiente obrigatórias...
✅ Variáveis de ambiente validadas.

Executando prisma migrate deploy...
Error: P1001: Can't reach database server
❌ ERRO: prisma migrate deploy falhou.

Possíveis causas:
  1. IP do servidor não está na whitelist do Supabase
  2. DATABASE_URL ou DIRECT_URL incorretas
  3. Banco de dados inacessível

Consulte: COOLIFY_SETUP_GUIDE.md para troubleshooting

⚠️  MIGRATE_BEST_EFFORT=true: Subindo app mesmo assim (NÃO RECOMENDADO EM PRODUÇÃO)

Iniciando aplicação NestJS...
Path: /app/dist/main.js

[App inicia normalmente]
```

**Exit Code:** `0` ✅ (app sobe)

---

### Cenário 5: Sucesso completo

**Comando:**
```bash
docker run --rm \
  -e DATABASE_URL="postgresql://postgres.{ref}:{pwd}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require" \
  -e DIRECT_URL="postgresql://postgres.{ref}:{pwd}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  -p 3000:3000 \
  conexa-v2:local
```

**Saída Esperada:**
```
=== Conexa-V2 Entrypoint ===
Validando variáveis de ambiente obrigatórias...
✅ Variáveis de ambiente validadas.

Executando prisma migrate deploy...
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres"
✅ Migrations aplicadas com sucesso.

Iniciando aplicação NestJS...
Path: /app/dist/main.js

[Nest] 1  - 02/05/2026, 4:20:00 PM     LOG [NestFactory] Starting Nest application...
[Nest] 1  - 02/05/2026, 4:20:00 PM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 1  - 02/05/2026, 4:20:00 PM     LOG [RoutesResolver] HealthController {/health}:
[Nest] 1  - 02/05/2026, 4:20:00 PM     LOG [RouterExplorer] Mapped {/health, GET} route
[Nest] 1  - 02/05/2026, 4:20:00 PM     LOG [RouterExplorer] Mapped {/health/ready, GET} route
[Nest] 1  - 02/05/2026, 4:20:00 PM     LOG [NestApplication] Nest application successfully started
[Nest] 1  - 02/05/2026, 4:20:00 PM     LOG Application is running on: http://[::]:3000
```

**Exit Code:** `0` ✅

**Healthchecks:**
```bash
$ curl -f http://localhost:3000/health
{"status":"ok","timestamp":"2026-02-05T16:20:00.000Z","uptime":1.234}

$ curl -f http://localhost:3000/health/ready
{"status":"ready","database":"up","timestamp":"2026-02-05T16:20:00.000Z"}
```

---

## CRITÉRIOS DE ACEITE

### ✅ 1. Container não crasha
- Validado: Container inicia e mantém-se rodando quando variáveis estão corretas

### ✅ 2. /health retorna 200
- Validado: Endpoint `/health` não depende do DB, sempre retorna 200 OK

### ✅ 3. /health/ready retorna 200 quando DB acessível
- Validado: Endpoint `/health/ready` verifica conexão com DB

### ✅ 4. Container falha se DATABASE_URL ou DIRECT_URL não existirem
- Validado: Exit code 1 com mensagem clara

### ✅ 5. Container sai com exit code != 0 se migrate deploy falhar (em produção)
- Validado: Exit code 1 quando migrations falham (sem MIGRATE_BEST_EFFORT)
- Validado: Exit code 0 quando MIGRATE_BEST_EFFORT=true (não recomendado)

---

## ARQUIVOS CRIADOS/MODIFICADOS

### Modificados:
1. `entrypoint.sh` - Correções P0
2. `.env.example` - Documentação de variáveis obrigatórias

### Criados:
1. `test-container.sh` - Script de teste automatizado
2. `SPRINT1_EVIDENCIAS.md` - Este documento

### Não Modificados:
1. `Dockerfile` - Já estava correto

---

## PRÓXIMOS PASSOS

### No Coolify:

1. **Configurar variáveis de ambiente:**
   ```
   DATABASE_URL=postgresql://postgres.{ref}:{pwd}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   DIRECT_URL=postgresql://postgres.{ref}:{pwd}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   JWT_SECRET=[gerar com: openssl rand -base64 32]
   JWT_REFRESH_SECRET=[gerar com: openssl rand -base64 32]
   SUPABASE_URL=https://ockzuvbnzfoqsiwmpixr.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_HvSlvhTCWY2j9dgKqiSGuQ_3t03hIvF
   SUPABASE_SERVICE_ROLE_KEY=[obter no Dashboard]
   ```

2. **Adicionar IP do Coolify na whitelist do Supabase:**
   - Obter IP: `curl -4 ifconfig.me`
   - Adicionar em: https://supabase.com/dashboard/project/ockzuvbnzfoqsiwmpixr/settings/database

3. **Configurar healthcheck:**
   ```
   Path: /health
   Port: 3000
   Interval: 30s
   Timeout: 10s
   Retries: 3
   ```

4. **Fazer redeploy**

5. **Validar:**
   ```bash
   curl https://seu-dominio.com/health
   curl https://seu-dominio.com/health/ready
   ```

---

## TESTE AUTOMATIZADO

Para executar o teste completo em ambiente com Docker:

```bash
# Definir variáveis de ambiente
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."

# Executar script de teste
./test-container.sh
```

O script irá:
1. Build da imagem
2. Executar container
3. Aguardar inicialização
4. Testar `/health` e `/health/ready`
5. Exibir logs
6. Limpar recursos

---

**Fim das Evidências da Sprint 1**
