
# Conexa - Plataforma de Gestão Educacional

## 1. Visão do Projeto

O **Conexa** é uma plataforma SaaS (_Software as a Service_) de gestão educacional, pedagógica e operacional, desenhada especificamente para o nicho de **instituições de educação infantil** que atendem crianças de 0 a 4 anos. 

Nossa visão é criar um ecossistema digital integrado que centraliza a administração, otimiza a comunicação e, acima de tudo, potencializa o desenvolvimento pedagógico. A plataforma foi concebida para ser a base de um sistema exemplar: **escalável, auditável, humano-centrista e tecnicamente impecável**.

O sistema nasce com suporte nativo a múltiplas unidades (multi-tenancy), uma hierarquia de acesso rigorosa baseada em papéis (RBAC), e ferramentas essenciais como o diário de bordo pedagógico, a geração de relatórios oficiais (RIA/RDIC – DF) e uma arquitetura preparada para a integração com agentes de Inteligência Artificial como ferramentas de suporte ao educador.

## 2. Princípios Fundamentais

O desenvolvimento do Conexa é guiado por princípios não negociáveis que garantem a segurança, a integridade e a qualidade do sistema.

| Princípio | Descrição |
| :--- | :--- |
| **Multi-tenancy na Raiz** | A arquitetura é projetada desde o início para isolar os dados de diferentes mantenedoras e suas respectivas unidades, garantindo segurança e privacidade. |
| **IA como Suporte** | A Inteligência Artificial será usada exclusivamente para apoiar decisões, automatizar tarefas repetitivas e fornecer insights. Nenhuma ação crítica é tomada sem a validação de um profissional (`human-in-the-loop`). |
| **Backend-Driven** | Toda a lógica de negócio, regras de validação e controle de acesso residem no backend. O frontend é responsável apenas pela apresentação da interface. |
| **Conformidade Regulatória** | O sistema seguirá as diretrizes da Base Nacional Comum Curricular (BNCC) e do Currículo em Movimento do Distrito Federal, facilitando a geração de relatórios oficiais. |
| **Segurança de Dados Sensíveis** | A proteção dos dados das crianças é a prioridade máxima. Implementamos controles de acesso rigorosos e práticas de segurança robustas para garantir a confidencialidade e integridade das informações. |

## 3. Stack Técnica

A escolha da stack foi feita para garantir performance, escalabilidade e uma excelente experiência de desenvolvimento, utilizando tecnologias modernas e consolidadas no mercado.

| Componente | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Backend** | Node.js + NestJS | Framework robusto, opinativo e escalável que organiza o código de forma modular e facilita a implementação de padrões como injeção de dependência. |
| **ORM** | Prisma | ORM de próxima geração que oferece segurança de tipos, autocompletar e uma API intuitiva para interagir com o banco de dados de forma segura e eficiente. |
| **Banco de Dados** | PostgreSQL (via Supabase) | Banco de dados relacional open-source poderoso, confiável e extensível, ideal para modelar as complexas relações de um sistema educacional. |
| **Autenticação** | JWT + RBAC | Autenticação baseada em tokens (JSON Web Tokens) combinada com um Controle de Acesso Baseado em Papéis (Role-Based Access Control) para garantir a segurança. |
| **Infraestrutura** | Docker + Coolify (GCP) | Conteinerização com Docker para garantir a portabilidade e consistência dos ambientes, com deploy automatizado em uma VPS na Google Cloud Platform. |
| **Inteligência Artificial** | Agentes Externos (OpenAI/Compatível) | Integração com modelos de linguagem avançados para tarefas de suporte, como sumarização de textos e sugestão de atividades. |

## 4. Estrutura Inicial do Projeto

A primeira entrega se concentra na fundação do sistema: o banco de dados e a documentação inicial. Nenhum outro código de aplicação (controllers, services, UI) foi criado nesta fase.

```
/conexa-v2
├── prisma/
│   └── schema.prisma   # Define todo o schema do banco de dados
└── README.md           # Este arquivo
```

- **`prisma/schema.prisma`**: Arquivo central que descreve todas as tabelas, colunas, relações, enums e regras do banco de dados. Ele serve como a "fonte da verdade" para a estrutura de dados do Conexa.
- **`README.md`**: Documento que introduz a visão, os princípios, a stack e a estrutura do projeto, servindo como guia para todos os desenvolvedores e stakeholders.
