#!/bin/bash
# Exemplos de uso da API de Diário de Bordo
# Gerado por MANUZ, Engenheiro de Software Sênior

# Configurar variáveis
API_URL="http://localhost:3000"
ACCESS_TOKEN="seu_access_token_aqui"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. CRIAR EVENTO - Alimentação
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "1. Criando evento de alimentação..."
curl -X POST "$API_URL/diary-events" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ALIMENTACAO",
    "title": "Almoço - Aceitou bem a sopa de legumes",
    "description": "Comeu toda a sopa de legumes e pediu para repetir. Mostrou interesse em experimentar a beterraba.",
    "eventDate": "2026-02-03T12:30:00.000Z",
    "childId": "clx_child_1",
    "classroomId": "clx_classroom_1",
    "tags": ["alimentação", "nutrição", "desenvolvimento"],
    "mediaUrls": ["https://storage.conexa.com/media/foto_almoco_1.jpg"]
  }'

echo -e "\n\n"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. CRIAR EVENTO - Desenvolvimento Cognitivo
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "2. Criando evento de desenvolvimento cognitivo..."
curl -X POST "$API_URL/diary-events" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DESENVOLVIMENTO_COGNITIVO",
    "title": "Identificou cores primárias",
    "description": "Durante a atividade de pintura, identificou corretamente as cores vermelho, azul e amarelo. Mostrou interesse em misturar as cores.",
    "eventDate": "2026-02-03T10:00:00.000Z",
    "childId": "clx_child_1",
    "classroomId": "clx_classroom_1",
    "planningId": "clx_planning_1",
    "tags": ["cores", "cognitivo", "artes"]
  }'

echo -e "\n\n"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. CRIAR EVENTO - Interação Social
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "3. Criando evento de interação social..."
curl -X POST "$API_URL/diary-events" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INTERACAO_SOCIAL",
    "title": "Compartilhou brinquedos com colega",
    "description": "Durante o momento de brincadeira livre, compartilhou seus blocos de montar com o colega João. Demonstrou empatia ao perceber que o colega queria brincar.",
    "eventDate": "2026-02-03T14:00:00.000Z",
    "childId": "clx_child_1",
    "classroomId": "clx_classroom_1",
    "tags": ["socialização", "empatia", "compartilhamento"]
  }'

echo -e "\n\n"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. LISTAR EVENTOS - Todos os eventos de uma criança
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "4. Listando todos os eventos de uma criança..."
curl -G "$API_URL/diary-events" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --data-urlencode "childId=clx_child_1"

echo -e "\n\n"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. LISTAR EVENTOS - Por período
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "5. Listando eventos de um período..."
curl -G "$API_URL/diary-events" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --data-urlencode "childId=clx_child_1" \
  --data-urlencode "startDate=2026-02-01T00:00:00.000Z" \
  --data-urlencode "endDate=2026-02-03T23:59:59.999Z"

echo -e "\n\n"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. LISTAR EVENTOS - Por tipo
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "6. Listando eventos de alimentação..."
curl -G "$API_URL/diary-events" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --data-urlencode "classroomId=clx_classroom_1" \
  --data-urlencode "type=ALIMENTACAO"

echo -e "\n\n"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. BUSCAR EVENTO - Por ID
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "7. Buscando evento por ID..."
curl "$API_URL/diary-events/clx_event_1" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo -e "\n\n"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. ATUALIZAR EVENTO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "8. Atualizando evento..."
curl -X PATCH "$API_URL/diary-events/clx_event_1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Comeu toda a sopa de legumes e pediu para repetir. Mostrou interesse em experimentar a beterraba e comeu dois pedaços. Elogiou o sabor."
  }'

echo -e "\n\n"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 9. DELETAR EVENTO (Soft Delete)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "9. Deletando evento (soft delete)..."
curl -X DELETE "$API_URL/diary-events/clx_event_1" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo -e "\n\n"

echo "✅ Exemplos concluídos!"
