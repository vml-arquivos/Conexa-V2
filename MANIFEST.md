# MANIFEST - CONEXA V2 SNAPSHOT

## Informações do Snapshot

**Arquivo:** Conexa-V2-snapshot.zip  
**SHA256:** d60d64eb40979755ef9d2e01ae66591e1023f77dc98dfe120efbae53332b741d  
**Tamanho:** 209KB  
**Data de Geração:** 2026-02-03 20:28 UTC  
**Gerado por:** MANUZ (IA Engenheira de Software Sênior)

---

## Arquivos Principais Incluídos

### Configuração do Projeto
- `package.json` - Dependências e scripts NPM
- `nest-cli.json` - Configuração NestJS
- `tsconfig.json` - Configuração TypeScript
- `tsconfig.build.json` - Build TypeScript
- `.gitignore` - Arquivos ignorados pelo Git
- `.env.example` - Template de variáveis de ambiente (sem credenciais)
- `.prettierrc` - Configuração Prettier

### Prisma
- `prisma/schema.prisma` - Schema v1.2 (26 models, 18 enums)
- `prisma/migrations/migration_lock.toml` - Lock de migrations
- `prisma/migrations/20260203000000_initial_setup/migration.sql` - Migration inicial

### Código Fonte (src/)
- `src/main.ts` - Entry point da aplicação
- `src/app.module.ts` - Módulo raiz
- `src/prisma/` - PrismaModule e PrismaService
- `src/auth/` - Módulo de autenticação (JWT + refresh tokens)
- `src/common/` - Guards RBAC, decorators, utils, AuditService
- `src/diary-event/` - Módulo Diário de Bordo (8 validações)
- `src/planning/` - Módulo de Planejamento v2
- `src/planning-template/` - Templates de planejamento
- `src/curriculum-matrix/` - Matriz Curricular
- `src/curriculum-matrix-entry/` - Entradas da matriz
- `src/curriculum-import/` - Importação de PDF (parser)
- `src/example/` - Exemplos de uso

### Scripts
- `scripts/test-parser.ts` - Script de teste do parser PDF
- `scripts/snapshot-manifest.sh` - Script de geração de manifest

### Testes
- `test/app.e2e-spec.ts` - Testes E2E
- `test/jest-e2e.json` - Configuração Jest E2E

### Documentação
- `README.md` - Documentação principal
- `AUTH_GUIDE.md` - Guia de autenticação
- `DIARY_EVENT_GUIDE.md` - Guia do Diário de Bordo
- `PLANNING_GUIDE_V2.md` - Guia de planejamento v2
- `IMPORT_GUIDE.md` - Guia de importação
- `PARSER_IMPLEMENTATION.md` - Implementação do parser PDF
- `MIGRATION_FINAL_REPORT.md` - Relatório de migração
- `SUPABASE_MIGRATION_SUCCESS.md` - Sucesso da migração Supabase
- `TIMEZONE_STANDARD.md` - Padrão de timezone
- `AUDIT_REPORT_FINAL.md` - Relatório de auditoria
- `CHANGELOG.md` - Changelog do projeto
- `CHANGELOG_v1.2.md` - Changelog v1.2

---

## Arquivos Excluídos (Segurança)

- `.env` - Variáveis de ambiente com credenciais reais
- `.git/` - Histórico Git
- `node_modules/` - Dependências NPM
- `dist/` - Build compilado
- `matriz-2026.pdf` - PDF de teste
- `extract-pdf.js` - Script temporário
- `pdf-sample.txt` - Amostra temporária
- `prisma/schema_v1.2_proposed.prisma` - Schema proposto (obsoleto)

---

## Estrutura do Repositório

```
Conexa-V2/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20260203000000_initial_setup/
│           └── migration.sql
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   ├── common/
│   ├── diary-event/
│   ├── planning/
│   ├── planning-template/
│   ├── curriculum-matrix/
│   ├── curriculum-matrix-entry/
│   ├── curriculum-import/
│   ├── prisma/
│   └── example/
├── scripts/
│   ├── test-parser.ts
│   └── snapshot-manifest.sh
├── test/
├── package.json
├── nest-cli.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Estatísticas

- **Total de arquivos:** 105
- **Models Prisma:** 26
- **Enums Prisma:** 18
- **Migrations:** 1
- **Módulos NestJS:** 10
- **Linhas de código:** ~21,000+

---

## Validação do Snapshot

### Verificar SHA256
```bash
sha256sum Conexa-V2-snapshot.zip
# Esperado: 25e1fb9c2761995fed8bf7249b83bd6dcd7b5a606b76cb944db80497821f955d
```

### Listar conteúdo
```bash
unzip -l Conexa-V2-snapshot.zip | grep -E "(prisma|src|package.json|README)"
```

### Verificar arquivos mínimos
```bash
unzip -l Conexa-V2-snapshot.zip | grep "prisma/schema.prisma"
unzip -l Conexa-V2-snapshot.zip | grep "prisma/migrations/migration_lock.toml"
unzip -l Conexa-V2-snapshot.zip | grep "package.json"
unzip -l Conexa-V2-snapshot.zip | grep "README.md"
unzip -l Conexa-V2-snapshot.zip | grep "src/main.ts"
unzip -l Conexa-V2-snapshot.zip | grep "scripts/test-parser.ts"
unzip -l Conexa-V2-snapshot.zip | grep "PARSER_IMPLEMENTATION.md"
unzip -l Conexa-V2-snapshot.zip | grep ".env.example"
```

### Verificar ausência de credenciais
```bash
unzip -l Conexa-V2-snapshot.zip | grep -E "\.env$"
# Não deve retornar nada
```

---

## Uso do Snapshot

### Extrair
```bash
unzip Conexa-V2-snapshot.zip
cd Conexa-V2
```

### Instalar dependências
```bash
npm install
```

### Configurar ambiente
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### Validar Prisma
```bash
npx prisma validate
npx prisma generate
```

### Build
```bash
npm run build
```

### Executar
```bash
npm run start:dev
```

---

## Checksums de Arquivos Críticos

```
1557fde76c09e558c96131124835ef1c0bb587975cd0017cb1c3f550a9bf1754  prisma/schema.prisma
3d7124a68de1c23d7a3634dac34814631c766be30c464f00d6d51e333df4dcc6  package.json
c8e607a068a6bc83f803a0fd9115a06b14c9778de62c67c12c73d5c38c11fd44  README.md
72f279773f08779120e9822a7e5bbd40fd2cefa08d0d97e5320dc0b746213e67  .env.example
b5b5836d995b42ab1d52b7e21462fc79a835caaceef3465d0ae03f3ee252aa8c  prisma/migrations/20260203000000_initial_setup/migration.sql
d6bae7899f05da956e1070ba5703455503208ef79e161acb18c93bfe3c6cd236  prisma/migrations/migration_lock.toml
```

---

**Status:** ✅ SNAPSHOT AUDITÁVEL E VERIFICÁVEL  
**Versão:** 1.0  
**Autor:** MANUZ
