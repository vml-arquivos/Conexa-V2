# 🚀 GUIA DE DEPLOY - P0 ISOLATION LOCKDOWN

## ✅ Pré-requisitos

- [x] PR #1 revisado e aprovado
- [x] Build passa sem erros
- [x] Security scan passou
- [x] Acesso ao Coolify
- [x] Backup do commit anterior (rollback pronto)

---

## 📋 OPÇÃO A: Deploy em Staging (Recomendado)

### 1. Criar Resource "Conexa API - Staging" no Coolify

**Configuração:**
```
Name: Conexa API - Staging
Type: Application
Source: GitHub
Repository: vml-arquivos/Conexa-V2
Branch: security/p0-isolation-lockdown
Build Pack: nixpacks
Port: 3000
```

**Variáveis de Ambiente:**
```env
DATABASE_URL=postgresql://postgres.ockzuvbnzfoqsiwmpixr:Conexaapiv1db@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
DIRECT_URL=postgresql://postgres.ockzuvbnzfoqsiwmpixr:Conexaapiv1db@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
JWT_SECRET=[mesmo da produção]
JWT_REFRESH_SECRET=[mesmo da produção]
SUPABASE_URL=https://ockzuvbnzfoqsiwmpixr.supabase.co
SUPABASE_ANON_KEY=sb_publishable_HvSlvhTCWY2j9dgKqiSGuQ_3t03hIvF
SUPABASE_SERVICE_ROLE_KEY=[obter no Dashboard]
NODE_ENV=staging
```

**Domínio (opcional):**
```
staging-apiconexa.casadf.com.br
```

### 2. Deploy

1. Clicar em "Deploy" no Coolify
2. Aguardar build e startup
3. Verificar logs (sem erros 500)

### 3. Smoke Test

```bash
# Executar smoke test manual
export API_BASE_URL="https://staging-apiconexa.casadf.com.br"

# Configurar tokens e IDs (ver scripts/security-smoke.sh)
export TOKEN_MANTENEDORA_A="..."
export TOKEN_MANTENEDORA_B="..."
export TOKEN_DEVELOPER="..."
export PLANNING_ID_A="..."
export PLANNING_ID_B="..."
export DIARY_EVENT_ID_A="..."
export DIARY_EVENT_ID_B="..."

# Executar
./scripts/security-smoke.sh $API_BASE_URL
```

**Resultado esperado:**
```
✅ TODOS OS TESTES PASSARAM!
- Cross-tenant access retorna 404
- DEVELOPER mantém acesso total (200)
```

### 4. Validação Manual

**Teste 1: Login**
```bash
curl -X POST https://staging-apiconexa.casadf.com.br/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@mantenedora.com","password":"senha"}'
```

**Teste 2: Listagens**
```bash
curl -X GET https://staging-apiconexa.casadf.com.br/plannings \
  -H 'Authorization: Bearer TOKEN'
```

**Teste 3: Cross-tenant (deve retornar 404)**
```bash
curl -X GET https://staging-apiconexa.casadf.com.br/plannings/ID_OUTRA_MANTENEDORA \
  -H 'Authorization: Bearer TOKEN'
```

### 5. Se Staging OK → Merge e Deploy Produção

```bash
# Merge PR
gh pr merge 1 --squash

# Deploy produção (ver Opção B)
```

---

## 📋 OPÇÃO B: Deploy Direto em Produção (Com Rollback Pronto)

### 1. Merge PR

```bash
cd /home/ubuntu/Conexa-V2
git checkout main
git pull origin main

# Verificar último commit antes do merge (para rollback)
git log -1 --oneline
# Exemplo: abc1234 fix(deploy): Sprint 1 P0 - container startup and migration validation

# Merge PR
gh pr merge 1 --squash
```

### 2. Deploy no Coolify

**Opção 2.1: Auto-deploy (se configurado)**
- Coolify detecta push em `main` e faz deploy automático

**Opção 2.2: Manual**
1. Acessar Coolify
2. Selecionar "Conexa API - Production"
3. Clicar em "Redeploy"
4. Aguardar build e startup

### 3. Smoke Test em Produção

```bash
export API_BASE_URL="https://apiconexa.casadf.com.br"

# Configurar tokens e IDs
export TOKEN_MANTENEDORA_A="..."
export TOKEN_MANTENEDORA_B="..."
export TOKEN_DEVELOPER="..."
export PLANNING_ID_A="..."
export PLANNING_ID_B="..."
export DIARY_EVENT_ID_A="..."
export DIARY_EVENT_ID_B="..."

# Executar
./scripts/security-smoke.sh $API_BASE_URL
```

### 4. Validação Manual em Produção

**Teste 1: Frontend continua funcionando**
```
https://democonexa.casadf.com.br/login
```

**Teste 2: API responde**
```bash
curl https://apiconexa.casadf.com.br/health
```

**Teste 3: Cross-tenant retorna 404**
```bash
curl -X GET https://apiconexa.casadf.com.br/plannings/ID_OUTRA_MANTENEDORA \
  -H 'Authorization: Bearer TOKEN'
```

---

## 🔄 ROLLBACK (Se Necessário)

### Cenário 1: Erro Crítico (500, crash, etc)

**Rollback Imediato no Coolify:**

1. Acessar Coolify
2. Selecionar "Conexa API - Production"
3. Clicar em "Deployments"
4. Selecionar deployment anterior (commit `abc1234`)
5. Clicar em "Redeploy"

**OU via Git:**

```bash
cd /home/ubuntu/Conexa-V2
git checkout main
git revert HEAD
git push origin main
```

### Cenário 2: Isolamento Quebrado (retorna 200 ao invés de 404)

**NÃO fazer rollback imediato** (vulnerabilidade ainda existe)

**Ação:**
1. Investigar logs
2. Corrigir bug em nova branch
3. Fazer novo PR
4. Deploy da correção

---

## 📊 CHECKLIST DE ACEITE

### Pré-Deploy
- [x] PR #1 criado e revisado
- [x] Build passa
- [x] Security scan passa
- [x] Nenhum `findUnique` por ID sem escopo
- [x] Todos controllers de negócio têm ScopeGuard

### Pós-Deploy
- [ ] Deploy OK (sem erros 500)
- [ ] Frontend continua funcionando (login, listagens)
- [ ] Cross-tenant access retorna 404
- [ ] DEVELOPER mantém acesso total (200)
- [ ] Smoke test passa (8/8 testes)
- [ ] Nenhum erro crítico nos logs

### Rollback
- [ ] Commit anterior identificado
- [ ] Rollback testado mentalmente
- [ ] Plano de rollback documentado

---

## 📈 MONITORAMENTO PÓS-DEPLOY

### Logs a Monitorar (Primeiras 24h)

**1. Erros 500:**
```bash
# No Coolify, filtrar logs por "500"
```

**2. Erros de autenticação:**
```bash
# Filtrar logs por "Unauthorized" ou "Forbidden"
```

**3. Queries lentas:**
```bash
# Filtrar logs por "slow query" ou "timeout"
```

### Métricas a Acompanhar

- **Taxa de erro 4xx:** Pode aumentar (esperado, pois cross-tenant agora retorna 404)
- **Taxa de erro 5xx:** Deve permanecer estável (se aumentar, investigar)
- **Tempo de resposta:** Deve permanecer estável
- **Uso de CPU/Memória:** Deve permanecer estável

---

## ⚠️ BREAKING CHANGES

### Impacto Esperado

**1. Testes automatizados:**
- Testes que usam IDs hardcoded de outras mantenedoras **vão falhar**
- **Ação:** Atualizar testes para usar dados do mesmo tenant

**2. Integrações externas:**
- Integrações que dependem de acessar recursos cross-tenant **vão quebrar**
- **Ação:** Revisar e atualizar integrações

**3. Scripts internos:**
- Scripts que fazem queries cross-tenant **vão falhar**
- **Ação:** Usar token DEVELOPER ou atualizar lógica

---

## 📞 SUPORTE

### Em caso de problemas:

1. **Verificar logs do Coolify**
2. **Consultar este guia (seção Rollback)**
3. **Executar smoke test para diagnóstico**
4. **Se crítico:** Fazer rollback imediato
5. **Se não crítico:** Abrir issue no GitHub com logs

---

## ✅ CONCLUSÃO

**Após deploy bem-sucedido:**

- ✅ Vulnerabilidade P0 corrigida
- ✅ Isolamento tenant garantido
- ✅ Sistema seguro para multi-tenant
- ✅ FASE 1 (Backend) encerrada

**Próximos passos:**
- Monitorar por 24-48h
- Atualizar testes automatizados
- Documentar mudanças para equipe

---

**Repositório:** https://github.com/vml-arquivos/Conexa-V2  
**PR:** https://github.com/vml-arquivos/Conexa-V2/pull/1  
**Commit:** e0c3fc2
