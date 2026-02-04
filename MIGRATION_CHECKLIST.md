# Checklist de Migração: Schema v1.1 para Supabase

**Data:** 03 de Fevereiro de 2026
**Autor:** MANUZ, Arquiteto de Dados

Este checklist fornece o passo a passo para aplicar o schema `v1.1` congelado a um banco de dados PostgreSQL no Supabase usando o Prisma Migrate.

---

### Pré-requisitos

1.  **Projeto Supabase Criado:** Você precisa ter um projeto ativo no [Supabase](https://supabase.com/).
2.  **Connection String do Banco de Dados:** Você deve ter a URL de conexão do seu banco de dados. No Supabase, você a encontra em `Project Settings` > `Database` > `Connection string` (use a que é específica para `Transaction mode`).
3.  **Node.js e NPM/PNPM/Yarn:** O ambiente de desenvolvimento precisa ter o Node.js e um gerenciador de pacotes instalado.
4.  **Prisma CLI Instalado:** O Prisma CLI deve estar instalado como uma dependência de desenvolvimento no seu projeto (`npm install -D prisma`).

### Passo a Passo da Migração

#### Passo 1: Configurar a Variável de Ambiente

Antes de executar qualquer comando do Prisma, você precisa configurar a URL de conexão do seu banco de dados Supabase como uma variável de ambiente. A forma mais segura é criar um arquivo `.env` na raiz do seu projeto.

1.  **Crie o arquivo `.env`:**

    ```sh
    touch .env
    ```

2.  **Adicione a URL de conexão ao arquivo `.env`:**

    ```env
    # .env
    DATABASE_URL="postgresql://postgres:[SUA_SENHA]@[ID_DO_PROJETO].db.supabase.co:5432/postgres"
    ```

    **Importante:** Substitua `[SUA_SENHA]` e `[ID_DO_PROJETO]` pelos valores corretos do seu projeto Supabase. Certifique-se de que o arquivo `.env` esteja no seu `.gitignore` para não vazar suas credenciais.

#### Passo 2: Gerar a Primeira Migração

Este comando irá introspectar o `schema.prisma`, compará-lo com o estado do banco de dados (que está vazio) e criar o primeiro arquivo de migração SQL.

1.  **Execute o comando `prisma migrate dev`:**

    ```sh
    npx prisma migrate dev --name init
    ```

    -   `migrate dev`: Comando para desenvolvimento que cria e aplica migrações.
    -   `--name init`: Dá um nome descritivo à migração (ex: `init` para a primeira).

2.  **O que esperar:**
    -   O Prisma irá se conectar ao banco de dados, ver que ele está vazio e gerar um arquivo SQL com todos os `CREATE TABLE`, `CREATE INDEX`, etc., necessários para criar a estrutura de dados definida no `schema.prisma`.
    -   Este arquivo será salvo em um novo diretório: `prisma/migrations/[TIMESTAMP]_init/migration.sql`.
    -   O Prisma aplicará automaticamente esta migração ao seu banco de dados Supabase.
    -   Uma tabela `_prisma_migrations` será criada no seu banco para rastrear as migrações aplicadas.

#### Passo 3: Gerar o Prisma Client

Após a migração ser aplicada com sucesso, o banco de dados está sincronizado com o schema. O último passo é gerar o Prisma Client, que é o cliente de banco de dados TypeScript, seguro e com autocompletar, que você usará na sua aplicação.

1.  **Execute o comando `prisma generate`:**

    ```sh
    npx prisma generate
    ```

2.  **O que esperar:**
    -   O Prisma irá ler o `schema.prisma` e gerar o código do cliente dentro de `node_modules/@prisma/client`.
    -   Agora você pode importar e usar o Prisma Client na sua aplicação NestJS:

        ```typescript
        import { PrismaClient } from '@prisma/client';

        const prisma = new PrismaClient();
        // ... agora você pode usar prisma.user.create(...), etc.
        ```

---

### Conclusão

Após seguir estes três passos, seu banco de dados Supabase estará perfeitamente sincronizado com o schema `v1.1` do Conexa, e seu ambiente de desenvolvimento estará pronto para começar a construir a lógica de negócio com o Prisma Client. O schema está oficialmente **congelado e migrado**.
