# Migration Setup - Patch/Diff e Comandos

## Arquivos Alterados/Criados

### 1. `package.json`

**Alteração:** Adicionados scripts para gerenciar migrações Prisma.

```diff
   "scripts": {
+    "build": "nest build",
+    "start": "nest start",
+    "start:dev": "nest start --watch",
+    "start:prod": "node dist/main",
+    "prisma:generate": "prisma generate",
+    "db:migrate:dev": "prisma migrate dev",
+    "db:migrate:deploy": "prisma migrate deploy",
+    "db:studio": "prisma studio",
     "test": "echo \"Error: no test specified\" && exit 1"
   },
```

### 2. `prisma/migrations/20260203000000_initial_setup/migration.sql`

**Novo arquivo:** Migração inicial gerada a partir do schema Prisma.

Este arquivo contém todo o SQL necessário para criar as tabelas, enums, índices e constraints definidos no `schema.prisma`.

### 3. `README.md`

**Alteração:** Adicionada seção "10. Supabase / Migrações" com instruções de configuração e deploy.

---

## Comandos Executáveis

### Para Desenvolvimento Local (com banco de dados conectado)

```bash
# 1. Configurar DATABASE_URL no .env
echo 'DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"' >> .env

# 2. Gerar Prisma Client
npm run prisma:generate

# 3. Aplicar migração no banco de desenvolvimento
npm run db:migrate:dev

# 4. (Opcional) Abrir Prisma Studio para visualizar dados
npm run db:studio
```

### Para Deploy em Produção (Supabase)

```bash
# 1. Configurar DATABASE_URL no .env (ou variável de ambiente do CI/CD)
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"

# 2. Gerar Prisma Client
npm run prisma:generate

# 3. Aplicar migrações pendentes (SEGURO para produção)
npm run db:migrate:deploy

# 4. Iniciar aplicação
npm run start:prod
```

---

## Estrutura de Migrações Criada

```
prisma/
├── schema.prisma
└── migrations/
    └── 20260203000000_initial_setup/
        └── migration.sql
```

---

## Notas Importantes

- **NUNCA** use `npm run db:migrate:dev` em produção.
- Use `npm run db:migrate:deploy` para aplicar migrações de forma segura.
- A migração inicial foi gerada usando `prisma migrate diff --from-empty --to-schema-datamodel`.
