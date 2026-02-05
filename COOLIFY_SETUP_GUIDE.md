# GUIA DE CONFIGURAÇÃO COOLIFY - CONEXA-V2

**Data:** 2026-02-04  
**Objetivo:** Configurar variáveis de ambiente no Coolify para deploy funcional

---

## 1. VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS

### Acesse o Coolify
1. Vá para o projeto Conexa-V2 no Coolify
2. Clique em **Environment Variables**
3. Adicione as seguintes variáveis:

### Database (Supabase)

```env
DATABASE_URL=postgresql://postgres.ockzuvbnzfoqsiwmpixr:Conexaapiv1db@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require

DIRECT_URL=postgresql://postgres.ockzuvbnzfoqsiwmpixr:Conexaapiv1db@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

⚠️ **IMPORTANTE:**
- `DATABASE_URL` usa porta **6543** (Transaction Mode) para runtime
- `DIRECT_URL` usa porta **5432** (Session Mode) para migrations
- Ambas usam `sslmode=require` (obrigatório no Supabase)
- Usuário é `postgres.ockzuvbnzfoqsiwmpixr` (com project_ref)

### JWT Secrets

```env
JWT_SECRET=seu_secret_seguro_aqui_minimo_32_caracteres
JWT_REFRESH_SECRET=seu_refresh_secret_seguro_aqui_minimo_32_caracteres
```

⚠️ **GERE SECRETS FORTES:**
```bash
# Gerar secrets aleatórios
openssl rand -base64 32
```

### Supabase API

```env
SUPABASE_URL=https://ockzuvbnzfoqsiwmpixr.supabase.co
SUPABASE_ANON_KEY=sb_publishable_HvSlvhTCWY2j9dgKqiSGuQ_3t03hIvF
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

⚠️ **OBTER SERVICE_ROLE_KEY:**
1. Acessar: https://supabase.com/dashboard/project/ockzuvbnzfoqsiwmpixr/settings/api
2. Copiar "service_role" key (secret)

### Port

```env
PORT=3000
```

---

## 2. CONFIGURAR WHITELIST DE IP NO SUPABASE

### Por que é necessário?

O Supabase bloqueia conexões PostgreSQL diretas de IPs desconhecidos. Sem adicionar o IP do Coolify na whitelist, o erro P1001 continuará ocorrendo.

### Passos:

#### 2.1 Obter IP do servidor Coolify

**Opção A: Via terminal do Coolify**
```bash
curl -4 ifconfig.me
```

**Opção B: Via logs do deploy**
- Procure por "connecting from IP: X.X.X.X" nos logs

#### 2.2 Adicionar IP na whitelist do Supabase

1. Acessar: https://supabase.com/dashboard/project/ockzuvbnzfoqsiwmpixr/settings/database
2. Rolar até **Connection Pooling**
3. Em **Allowed IP addresses**, clicar em **Add IP**
4. Adicionar o IP do Coolify
5. Clicar em **Save**

#### 2.3 Testar conexão

Após adicionar o IP, o próximo deploy deve funcionar sem P1001.

---

## 3. HEALTHCHECK NO COOLIFY

### Configuração recomendada:

```
Healthcheck Path: /health
Healthcheck Port: 3000
Healthcheck Interval: 30s
Healthcheck Timeout: 10s
Healthcheck Retries: 3
```

⚠️ **IMPORTANTE:**
- Use `/health` (não `/ready`)
- `/health` NÃO depende do banco (sempre retorna 200)
- `/ready` depende do banco (pode falhar se DB oscilar)

---

## 4. ESTRATÉGIA DE MIGRATIONS

### Opção A: Migrations Automáticas (Atual)

**Como funciona:**
- `entrypoint.sh` executa `npx prisma migrate deploy` no startup
- Se falhar, app sobe mesmo assim (best effort)

**Vantagens:**
- ✅ Simples
- ✅ Migrations aplicadas automaticamente

**Desvantagens:**
- ❌ Pode falhar se IP não estiver na whitelist
- ❌ Logs de erro podem ser confusos

**Quando usar:**
- IP do Coolify está na whitelist do Supabase
- Migrations são pequenas e rápidas

### Opção B: Migrations Manuais (Recomendado para produção)

**Como funciona:**
- Remover `npx prisma migrate deploy` do `entrypoint.sh`
- Executar migrations via GitHub Actions ou manualmente antes do deploy

**Vantagens:**
- ✅ Controle total sobre quando migrations rodam
- ✅ Não bloqueia o deploy
- ✅ Logs mais claros

**Desvantagens:**
- ❌ Requer passo adicional antes do deploy

**Quando usar:**
- Migrations complexas ou demoradas
- Múltiplos ambientes (staging, production)
- Precisa de rollback controlado

---

## 5. VERIFICAÇÃO PÓS-DEPLOY

### 5.1 Verificar se app está rodando

```bash
curl https://seu-dominio.com/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T20:30:00.000Z"
}
```

### 5.2 Verificar logs do deploy

No Coolify, verificar logs para:
- ✅ "Executando prisma migrate deploy..." (se migrations automáticas)
- ✅ "Iniciando app usando: /app/dist/src/main.js"
- ✅ "Application is running on: http://[::]:3000"

### 5.3 Verificar migrations aplicadas

**Via API REST do Supabase:**
```bash
curl -X GET \
  'https://ockzuvbnzfoqsiwmpixr.supabase.co/rest/v1/_prisma_migrations?select=*' \
  -H "apikey: sb_publishable_HvSlvhTCWY2j9dgKqiSGuQ_3t03hIvF" \
  -H "Authorization: Bearer sb_publishable_HvSlvhTCWY2j9dgKqiSGuQ_3t03hIvF"
```

---

## 6. TROUBLESHOOTING

### Erro: P1001 "Can't reach database server"

**Causa:** IP do Coolify não está na whitelist do Supabase

**Solução:**
1. Obter IP do Coolify: `curl -4 ifconfig.me`
2. Adicionar IP na whitelist do Supabase (seção 2.2)
3. Fazer redeploy

### Erro: "Circuit breaker open"

**Causa:** Múltiplas tentativas de conexão falhadas

**Solução:**
1. Aguardar 5-10 minutos (circuit breaker reseta automaticamente)
2. Verificar se IP está na whitelist
3. Tentar novamente

### Erro: "Tenant or user not found"

**Causa:** Usuário ou senha incorretos na connection string

**Solução:**
1. Verificar se usuário é `postgres.ockzuvbnzfoqsiwmpixr` (com project_ref)
2. Verificar se senha está correta: `Conexaapiv1db`
3. Verificar se host é `aws-1-sa-east-1.pooler.supabase.com` (não aws-0)

### App não sobe após deploy

**Verificar:**
1. Logs do Coolify para erros
2. Se `DATABASE_URL` está definida (obrigatória no entrypoint.sh)
3. Se porta 3000 está exposta corretamente
4. Se healthcheck está apontando para `/health`

---

## 7. CHECKLIST PRÉ-DEPLOY

- [ ] Variáveis de ambiente configuradas no Coolify
- [ ] IP do Coolify adicionado na whitelist do Supabase
- [ ] JWT secrets gerados (não usar valores de exemplo)
- [ ] SUPABASE_SERVICE_ROLE_KEY obtida e configurada
- [ ] Healthcheck configurado para `/health`
- [ ] Estratégia de migrations definida (automática ou manual)
- [ ] Teste de `/health` endpoint funcionando

---

## 8. LINKS ÚTEIS

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ockzuvbnzfoqsiwmpixr
- **Database Settings:** https://supabase.com/dashboard/project/ockzuvbnzfoqsiwmpixr/settings/database
- **API Settings:** https://supabase.com/dashboard/project/ockzuvbnzfoqsiwmpixr/settings/api
- **Prisma Docs:** https://www.prisma.io/docs

---

**Fim do Guia de Configuração Coolify**
