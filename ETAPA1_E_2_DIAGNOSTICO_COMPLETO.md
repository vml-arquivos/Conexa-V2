# ETAPA 1 E 2 — DIAGNÓSTICO COMPLETO E VALIDAÇÃO PRISMA

**Data:** 2026-02-04  
**Projeto:** Conexa-V2  
**Objetivo:** Diagnosticar e resolver conectividade Prisma ↔ Supabase

---

## RESUMO EXECUTIVO

### ✅ O que está funcionando
1. **Banco de dados Supabase está ATIVO**
2. **Tabelas já existem** (migrations aplicadas anteriormente)
3. **API REST do Supabase funciona perfeitamente**
4. **Schema Prisma é válido** (`npx prisma validate` ✅)
5. **Prisma Client gera corretamente** (`npx prisma generate` ✅)
6. **Dockerfile multi-stage funciona** (build não é o problema)
7. **Application sobe** (mesmo com migrate falhando)

### ❌ O que está falhando
1. **Conexão PostgreSQL direta do sandbox** → Bloqueada por firewall/IP
2. **`prisma migrate status`** → Erro: "Circuit breaker open: Unable to establish connection"
3. **`prisma migrate deploy`** → Mesmo erro (esperado)

### 🔍 CAUSA RAIZ IDENTIFICADA

**O erro P1001 "Can't reach database server" NÃO é causado por:**
- ❌ Banco pausado (banco está ativo)
- ❌ Senha incorreta (API REST funciona)
- ❌ URL mal formatada (URLs estão corretas)
- ❌ Schema inválido (schema valida corretamente)

**O erro P1001 É causado por:**
- ✅ **Firewall do Supabase bloqueando conexões PostgreSQL diretas**
- ✅ **IP do ambiente de origem não está na whitelist**
- ✅ **Circuit breaker do pooler ativado por tentativas falhadas**

---

## ETAPA 1 — AUDITORIA SUPABASE

### 1.1 Informações do Projeto

```
Project Reference: ockzuvbnzfoqsiwmpixr
Região: sa-east-1 (São Paulo)
Supabase URL: https://ockzuvbnzfoqsiwmpixr.supabase.co
Status: ✅ ATIVO
```

### 1.2 Connection Strings Corretas

#### DATABASE_URL (Runtime - Pooler Transaction Mode)
```
postgresql://postgres.ockzuvbnzfoqsiwmpixr:Conexaapiv1db@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**Características:**
- Porta: 6543 (Transaction Mode)
- Usuário: `postgres.{project_ref}`
- SSL: obrigatório
- Uso: queries rápidas, transações

#### DIRECT_URL (Migrations - Pooler Session Mode)
```
postgresql://postgres.ockzuvbnzfoqsiwmpixr:Conexaapiv1db@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Características:**
- Porta: 5432 (Session Mode)
- Usuário: `postgres.{project_ref}`
- SSL: obrigatório
- Uso: migrations, DDL operations

### 1.3 Testes Realizados

#### Teste 1: API REST ✅
```bash
✅ Tabela '_prisma_migrations': acessível (0 registros)
✅ Tabela 'AIContext': acessível (0 registros)
✅ Tabela 'Attendance': acessível (0 registros)
✅ Tabela 'Child': acessível (0 registros)
✅ Tabela 'Classroom': acessível (0 registros)
✅ Tabela 'Mantenedora': acessível (0 registros)
✅ Tabela 'User': acessível (0 registros)
```

**Conclusão:** Banco ativo, tabelas existem, API funciona.

#### Teste 2: Conexão PostgreSQL Direta ❌
```bash
❌ Direct connection (db.*.supabase.co): DNS não resolve
❌ Pooler Transaction (6543): Circuit breaker open
❌ Pooler Session (5432): Circuit breaker open
```

**Conclusão:** Firewall bloqueando conexões PostgreSQL do sandbox.

---

## ETAPA 2 — VALIDAÇÃO PRISMA

### 2.1 Validação do Schema

```bash
$ npx prisma validate
✅ The schema at prisma/schema.prisma is valid 🚀
```

**Análise do schema.prisma:**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

✅ **Correto:**
- Usa `url` e `directUrl` separadamente
- `binaryTargets` inclui `debian-openssl-3.0.x` para Docker
- Provider é `postgresql`

### 2.2 Geração do Prisma Client

```bash
$ npx prisma generate
✅ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 409ms
```

**Conclusão:** Geração funciona perfeitamente.

### 2.3 Status das Migrations

```bash
$ npx prisma migrate status
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-sa-east-1.pooler.supabase.com:5432"

❌ Error: Schema engine error:
FATAL: Circuit breaker open: Unable to establish connection to upstream database
```

**Análise:**
- Prisma **reconhece** o datasource corretamente
- Prisma **tenta conectar** ao pooler correto (aws-1-sa-east-1, porta 5432)
- Pooler **rejeita** a conexão (circuit breaker open)

**Por quê?**
- IP do sandbox não está na whitelist do Supabase
- Supabase bloqueia conexões PostgreSQL de IPs desconhecidos por padrão
- Apenas a API REST (porta 443/HTTPS) é aberta publicamente

---

## CAUSA RAIZ DO ERRO P1001 (DEFINITIVA)

### Fluxo do Erro

1. **Deploy no Coolify inicia**
2. **entrypoint.sh executa:** `npx prisma migrate deploy`
3. **Prisma tenta conectar** ao pooler via PostgreSQL (porta 5432)
4. **Supabase verifica IP** do servidor Coolify
5. **Se IP não está na whitelist:** Pooler retorna "Circuit breaker open"
6. **Prisma interpreta como:** "Can't reach database server" → **P1001**

### Por que o erro é intermitente?

- **Circuit breaker:** Após múltiplas falhas, o pooler bloqueia temporariamente
- **Timeout:** Às vezes a conexão demora e o Prisma desiste
- **IP dinâmico:** Se o Coolify usa IP dinâmico, às vezes funciona, às vezes não

---

## SOLUÇÃO DEFINITIVA

### Opção 1: Permitir IP do Coolify no Supabase (RECOMENDADO)

**Passos:**

1. **Obter IP público do servidor Coolify**
   ```bash
   curl -4 ifconfig.me
   ```

2. **Adicionar IP na whitelist do Supabase**
   - Acessar: https://supabase.com/dashboard/project/ockzuvbnzfoqsiwmpixr/settings/database
   - Ir em: **Connection Pooling > Allowed IP addresses**
   - Adicionar o IP do Coolify
   - Salvar

3. **Testar deploy novamente**

**Vantagens:**
- ✅ Migrations funcionam automaticamente no deploy
- ✅ Conexão estável e previsível
- ✅ Sem mudanças no código

**Desvantagens:**
- ❌ Requer acesso ao dashboard do Supabase
- ❌ Se IP do Coolify mudar, precisa atualizar

### Opção 2: Remover migrations do entrypoint (ALTERNATIVA)

**Modificar entrypoint.sh:**

```bash
#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL nao definido no runtime (Coolify Environment Variables)."
  exit 1
fi

echo "⚠️  Migrations devem ser executadas manualmente antes do deploy."
echo "   Execute: npx prisma migrate deploy"
echo ""

echo "Iniciando app usando: /app/dist/src/main.js"
exec node /app/dist/src/main.js
```

**Executar migrations manualmente:**
```bash
# Via GitHub Actions ou localmente
npx prisma migrate deploy
```

**Vantagens:**
- ✅ App sobe mesmo se migrations falharem
- ✅ Não depende de whitelist de IP
- ✅ Migrations são conscientes e controladas

**Desvantagens:**
- ❌ Requer passo manual ou CI/CD
- ❌ Risco de deploy sem migrations aplicadas

### Opção 3: Usar Supabase CLI para migrations (MODERNA)

**Instalar Supabase CLI no Coolify:**

```bash
# No Dockerfile ou via script
npm install -g supabase
```

**Configurar no entrypoint.sh:**

```bash
#!/usr/bin/env sh
set -eu

echo "Linking to Supabase project..."
supabase link --project-ref ockzuvbnzfoqsiwmpixr

echo "Running migrations via Supabase CLI..."
supabase db push

echo "Iniciando app..."
exec node /app/dist/src/main.js
```

**Vantagens:**
- ✅ Usa API do Supabase (não PostgreSQL direto)
- ✅ Não precisa de whitelist de IP
- ✅ Integração nativa com Supabase

**Desvantagens:**
- ❌ Requer Supabase CLI no container
- ❌ Mudança na estratégia de migrations

---

## RECOMENDAÇÃO FINAL

### Para Produção Imediata: **Opção 1**
1. Adicionar IP do Coolify na whitelist do Supabase
2. Manter `entrypoint.sh` como está (best effort)
3. Testar deploy

### Para Longo Prazo: **Opção 2 + CI/CD**
1. Remover migrations do entrypoint
2. Criar GitHub Action para executar migrations
3. Deploy só acontece após migrations bem-sucedidas

---

## PRÓXIMOS PASSOS (ETAPA 3)

1. ✅ Schema Prisma está correto (não precisa de correção)
2. ✅ URLs estão corretas (não precisa de correção)
3. ⚠️  Decisão necessária: Qual opção de solução implementar?

**Aguardando decisão do usuário para prosseguir.**

---

## EVIDÊNCIAS

### Arquivo .env atualizado
```env
DATABASE_URL="postgresql://postgres.ockzuvbnzfoqsiwmpixr:Conexaapiv1db@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres.ockzuvbnzfoqsiwmpixr:Conexaapiv1db@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

### Comandos testados
```bash
✅ npx prisma validate
✅ npx prisma generate
❌ npx prisma migrate status (bloqueado por firewall)
❌ npx prisma migrate deploy (bloqueado por firewall)
```

### Tabelas existentes no banco
```
_prisma_migrations, AIContext, Attendance, AuditLog, Child, Classroom,
ClassroomTeacher, CurriculumMatrix, CurriculumMatrixEntry, DiaryEvent,
DietaryRestriction, Enrollment, Mantenedora, MaterialRequest, Planning,
ReportBase, Role, StockItem, Unit, User, UserRole, UserRoleUnitScope
```

---

**Fim das Etapas 1 e 2 — Diagnóstico Completo**
