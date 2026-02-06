#!/bin/bash
# ============================================================================
# SMOKE TEST DE SEGURANÇA - P0 ISOLATION LOCKDOWN
# ============================================================================
# Objetivo: Validar que cross-tenant access por ID retorna 404 (não 200)
# Uso: ./scripts/security-smoke.sh <API_BASE_URL>
# Exemplo: ./scripts/security-smoke.sh https://apiconexa.casadf.com.br
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis
API_BASE_URL="${1:-http://localhost:3000}"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "============================================================================"
echo "🔒 SMOKE TEST DE SEGURANÇA - P0 ISOLATION LOCKDOWN"
echo "============================================================================"
echo "API Base URL: $API_BASE_URL"
echo ""

# ============================================================================
# Função auxiliar: testar endpoint
# ============================================================================
test_endpoint() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local token="$4"
  local expected_status="$5"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "[$TOTAL_TESTS] $test_name... "
  
  # Fazer request
  response=$(curl -s -w "\n%{http_code}" -X "$method" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    "$API_BASE_URL$endpoint" 2>/dev/null || echo "000")
  
  # Extrair status code
  status_code=$(echo "$response" | tail -n1)
  
  # Validar
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected HTTP $expected_status, got HTTP $status_code)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# ============================================================================
# PRÉ-REQUISITOS
# ============================================================================
echo "📋 PRÉ-REQUISITOS"
echo "----------------------------------------------------------------------------"
echo "Para executar este smoke test, você precisa:"
echo ""
echo "1. Dois tokens JWT de MANTENEDORAS DIFERENTES:"
echo "   - TOKEN_MANTENEDORA_A (ex: mantenedora_id = 'abc123')"
echo "   - TOKEN_MANTENEDORA_B (ex: mantenedora_id = 'xyz789')"
echo ""
echo "2. IDs de recursos criados por cada mantenedora:"
echo "   - PLANNING_ID_A (criado por Mantenedora A)"
echo "   - PLANNING_ID_B (criado por Mantenedora B)"
echo "   - DIARY_EVENT_ID_A (criado por Mantenedora A)"
echo "   - DIARY_EVENT_ID_B (criado por Mantenedora B)"
echo ""
echo "3. Um token JWT de DEVELOPER (acesso total)"
echo "   - TOKEN_DEVELOPER"
echo ""
echo "Configure as variáveis de ambiente antes de executar:"
echo ""
echo "  export TOKEN_MANTENEDORA_A='eyJhbGc...'"
echo "  export TOKEN_MANTENEDORA_B='eyJhbGc...'"
echo "  export TOKEN_DEVELOPER='eyJhbGc...'"
echo "  export PLANNING_ID_A='cuid_abc123'"
echo "  export PLANNING_ID_B='cuid_xyz789'"
echo "  export DIARY_EVENT_ID_A='cuid_abc456'"
echo "  export DIARY_EVENT_ID_B='cuid_xyz789'"
echo ""
echo "============================================================================"
echo ""

# Verificar se variáveis estão configuradas
if [ -z "$TOKEN_MANTENEDORA_A" ] || [ -z "$TOKEN_MANTENEDORA_B" ] || \
   [ -z "$TOKEN_DEVELOPER" ] || [ -z "$PLANNING_ID_A" ] || \
   [ -z "$PLANNING_ID_B" ] || [ -z "$DIARY_EVENT_ID_A" ] || \
   [ -z "$DIARY_EVENT_ID_B" ]; then
  echo -e "${YELLOW}⚠️  AVISO: Variáveis de ambiente não configuradas${NC}"
  echo ""
  echo "Este é um teste MANUAL. Configure as variáveis acima e execute novamente."
  echo ""
  echo "Exemplo de configuração:"
  echo ""
  echo "  # 1. Fazer login como Mantenedora A"
  echo "  curl -X POST $API_BASE_URL/auth/login \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"email\":\"admin@mantenedoraa.com\",\"password\":\"senha\"}' \\"
  echo "    | jq -r '.accessToken'"
  echo ""
  echo "  # 2. Criar um planejamento como Mantenedora A"
  echo "  curl -X POST $API_BASE_URL/plannings \\"
  echo "    -H 'Authorization: Bearer \$TOKEN_MANTENEDORA_A' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{...}' | jq -r '.id'"
  echo ""
  echo "  # 3. Repetir para Mantenedora B"
  echo ""
  exit 1
fi

# ============================================================================
# TESTES DE CROSS-TENANT ACCESS
# ============================================================================
echo "🧪 TESTES DE CROSS-TENANT ACCESS"
echo "----------------------------------------------------------------------------"
echo ""

echo "Cenário 1: Mantenedora A tenta acessar recurso de Mantenedora B"
echo "----------------------------------------------------------------------------"
test_endpoint \
  "GET /plannings/{id_mantenedora_b} com token de Mantenedora A" \
  "GET" \
  "/plannings/$PLANNING_ID_B" \
  "$TOKEN_MANTENEDORA_A" \
  "404"

test_endpoint \
  "GET /diary-events/{id_mantenedora_b} com token de Mantenedora A" \
  "GET" \
  "/diary-events/$DIARY_EVENT_ID_B" \
  "$TOKEN_MANTENEDORA_A" \
  "404"

echo ""
echo "Cenário 2: Mantenedora B tenta acessar recurso de Mantenedora A"
echo "----------------------------------------------------------------------------"
test_endpoint \
  "GET /plannings/{id_mantenedora_a} com token de Mantenedora B" \
  "GET" \
  "/plannings/$PLANNING_ID_A" \
  "$TOKEN_MANTENEDORA_B" \
  "404"

test_endpoint \
  "GET /diary-events/{id_mantenedora_a} com token de Mantenedora B" \
  "GET" \
  "/diary-events/$DIARY_EVENT_ID_A" \
  "$TOKEN_MANTENEDORA_B" \
  "404"

echo ""
echo "Cenário 3: DEVELOPER acessa recursos de ambas mantenedoras (acesso total)"
echo "----------------------------------------------------------------------------"
test_endpoint \
  "GET /plannings/{id_mantenedora_a} com token de DEVELOPER" \
  "GET" \
  "/plannings/$PLANNING_ID_A" \
  "$TOKEN_DEVELOPER" \
  "200"

test_endpoint \
  "GET /plannings/{id_mantenedora_b} com token de DEVELOPER" \
  "GET" \
  "/plannings/$PLANNING_ID_B" \
  "$TOKEN_DEVELOPER" \
  "200"

test_endpoint \
  "GET /diary-events/{id_mantenedora_a} com token de DEVELOPER" \
  "GET" \
  "/diary-events/$DIARY_EVENT_ID_A" \
  "$TOKEN_DEVELOPER" \
  "200"

test_endpoint \
  "GET /diary-events/{id_mantenedora_b} com token de DEVELOPER" \
  "GET" \
  "/diary-events/$DIARY_EVENT_ID_B" \
  "$TOKEN_DEVELOPER" \
  "200"

# ============================================================================
# RESUMO
# ============================================================================
echo ""
echo "============================================================================"
echo "📊 RESUMO"
echo "============================================================================"
echo "Total de testes: $TOTAL_TESTS"
echo -e "${GREEN}Passou: $PASSED_TESTS${NC}"
echo -e "${RED}Falhou: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ TODOS OS TESTES PASSARAM!${NC}"
  echo ""
  echo "O isolamento tenant está funcionando corretamente:"
  echo "- Cross-tenant access retorna 404 (não vaza existência)"
  echo "- DEVELOPER mantém acesso total (200)"
  echo ""
  exit 0
else
  echo -e "${RED}❌ ALGUNS TESTES FALHARAM!${NC}"
  echo ""
  echo "Verifique os logs acima e corrija os problemas antes de fazer deploy."
  echo ""
  exit 1
fi
