-- Script SQL para atualizar nomes reais dos funcionários
-- Baseado no arquivo ALUNOS2026.xlsx e informações fornecidas

-- ============================================================
-- STAFF CENTRAL (Acesso a todas as 7 unidades)
-- ============================================================

-- Bruna Vaz - Coordenadora Geral Pedagógica
UPDATE "User"
SET "firstName" = 'Bruna',
    "lastName" = 'Vaz'
WHERE email = 'bruna.vaz@cocris.org';

-- Carla - Psicóloga (sobrenome não informado, manter atual)
UPDATE "User"
SET "firstName" = 'Carla'
WHERE email = 'carla.psicologa@cocris.org';

-- ============================================================
-- GESTÃO ARARA CANINDÉ
-- ============================================================

-- Daniel - Diretor
UPDATE "User"
SET "firstName" = 'Daniel',
    "lastName" = ''
WHERE email = 'diretor.arara@cocris.org';

-- Ana Carolina de Araujo - Coordenadora Pedagógica
UPDATE "User"
SET "firstName" = 'Ana Carolina',
    "lastName" = 'de Araujo'
WHERE email = 'ana.carolina@cocris.org';

-- Adriel - Secretário
UPDATE "User"
SET "firstName" = 'Adriel',
    "lastName" = ''
WHERE email = 'secretaria.arara@cocris.org';

-- Dorli - Nutricionista
UPDATE "User"
SET "firstName" = 'Dorli',
    "lastName" = ''
WHERE email = 'nutricionista.arara@cocris.org';

-- ============================================================
-- PROFESSORAS ARARA CANINDÉ
-- ============================================================

-- RAQUEL - Berçário I (email: maria.silva@cocris.edu.br)
UPDATE "User"
SET "firstName" = 'Raquel',
    "lastName" = ''
WHERE email = 'maria.silva@cocris.edu.br';

-- ELISANGELA - Berçário II A (email: ana.santos@cocris.edu.br)
UPDATE "User"
SET "firstName" = 'Elisangela',
    "lastName" = ''
WHERE email = 'ana.santos@cocris.edu.br';

-- LUCIENE - Maternal I A (email: joana.oliveira@cocris.edu.br)
UPDATE "User"
SET "firstName" = 'Luciene',
    "lastName" = ''
WHERE email = 'joana.oliveira@cocris.edu.br';

-- RAQUEL - Maternal II A (email: carla.souza@cocris.edu.br)
-- Nota: Mesma professora do Berçário I, mas turma diferente
UPDATE "User"
SET "firstName" = 'Raquel',
    "lastName" = ''
WHERE email = 'carla.souza@cocris.edu.br';

-- ============================================================
-- OBSERVAÇÕES
-- ============================================================
-- Professoras sem email cadastrado no sistema:
-- - JESSICA (Berçário II B)
-- - ANA (Maternal I B)
-- - EDILVANA (Maternal I C)
-- - ANGELICA (Maternal II B)
-- - LUCIENE (Maternal II C) - já tem email em Maternal I A

-- Emails que não têm correspondência no arquivo:
-- - paula.costa@cocris.edu.br (Pré-escola I)
-- - fernanda.lima@cocris.edu.br (Pré-escola II)
-- Estes não serão atualizados pois não há dados no arquivo ALUNOS2026.xlsx

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- Para verificar as atualizações:
SELECT email, "firstName", "lastName"
FROM "User"
WHERE email IN (
  'bruna.vaz@cocris.org',
  'carla.psicologa@cocris.org',
  'diretor.arara@cocris.org',
  'ana.carolina@cocris.org',
  'secretaria.arara@cocris.org',
  'nutricionista.arara@cocris.org',
  'maria.silva@cocris.edu.br',
  'ana.santos@cocris.edu.br',
  'joana.oliveira@cocris.edu.br',
  'carla.souza@cocris.edu.br'
)
ORDER BY email;
