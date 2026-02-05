#!/usr/bin/env bash
# =============================================================================
# Script de Teste do Container Conexa-V2
# =============================================================================
# Este script deve ser executado no ambiente onde Docker está disponível
# (Coolify, CI/CD, ou máquina local com Docker)
# =============================================================================

set -e

echo "=== Teste do Container Conexa-V2 ==="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis
IMAGE_NAME="conexa-v2:local"
CONTAINER_NAME="conexa-v2-test"

# Verificar se Docker está disponível
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado. Instale Docker primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker encontrado${NC}"
echo ""

# Verificar se variáveis de ambiente estão definidas
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}❌ DATABASE_URL não definida${NC}"
    echo "   Defina com: export DATABASE_URL='postgresql://...'"
    exit 1
fi

if [ -z "${DIRECT_URL:-}" ]; then
    echo -e "${RED}❌ DIRECT_URL não definida${NC}"
    echo "   Defina com: export DIRECT_URL='postgresql://...'"
    exit 1
fi

echo -e "${GREEN}✅ Variáveis de ambiente definidas${NC}"
echo ""

# Limpar container anterior se existir
echo "Limpando container anterior (se existir)..."
docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
echo ""

# Build da imagem
echo "=== FASE 1: Build da Imagem ==="
echo "Executando: docker build -t ${IMAGE_NAME} ."
echo ""

if docker build -t ${IMAGE_NAME} .; then
    echo -e "${GREEN}✅ Build concluído com sucesso${NC}"
else
    echo -e "${RED}❌ Build falhou${NC}"
    exit 1
fi

echo ""
echo "=== FASE 2: Executar Container ==="
echo "Executando container com variáveis de ambiente..."
echo ""

# Executar container em background
docker run -d \
    --name ${CONTAINER_NAME} \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e DIRECT_URL="${DIRECT_URL}" \
    -e JWT_SECRET="test_secret_key_for_testing_only" \
    -e JWT_REFRESH_SECRET="test_refresh_secret_key_for_testing_only" \
    -e SUPABASE_URL="${SUPABASE_URL:-}" \
    -e SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}" \
    -e SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}" \
    -e MIGRATE_BEST_EFFORT="${MIGRATE_BEST_EFFORT:-false}" \
    -p 3000:3000 \
    ${IMAGE_NAME}

echo -e "${GREEN}✅ Container iniciado${NC}"
echo ""

# Aguardar container inicializar
echo "Aguardando container inicializar (15 segundos)..."
sleep 15
echo ""

# Verificar logs
echo "=== FASE 3: Logs do Container ==="
docker logs ${CONTAINER_NAME}
echo ""

# Verificar se container está rodando
if docker ps | grep -q ${CONTAINER_NAME}; then
    echo -e "${GREEN}✅ Container está rodando${NC}"
else
    echo -e "${RED}❌ Container não está rodando${NC}"
    echo ""
    echo "Logs completos:"
    docker logs ${CONTAINER_NAME}
    docker rm -f ${CONTAINER_NAME}
    exit 1
fi

echo ""
echo "=== FASE 4: Testes de Healthcheck ==="

# Teste 1: /health (liveness probe)
echo "Teste 1: GET /health (liveness probe)"
if curl -f -s http://localhost:3000/health > /tmp/health.json; then
    echo -e "${GREEN}✅ /health retornou 200 OK${NC}"
    echo "Resposta:"
    cat /tmp/health.json | jq . 2>/dev/null || cat /tmp/health.json
else
    echo -e "${RED}❌ /health falhou${NC}"
    docker logs ${CONTAINER_NAME}
    docker rm -f ${CONTAINER_NAME}
    exit 1
fi

echo ""

# Teste 2: /health/ready (readiness probe)
echo "Teste 2: GET /health/ready (readiness probe)"
if curl -f -s http://localhost:3000/health/ready > /tmp/ready.json; then
    echo -e "${GREEN}✅ /health/ready retornou 200 OK${NC}"
    echo "Resposta:"
    cat /tmp/ready.json | jq . 2>/dev/null || cat /tmp/ready.json
else
    echo -e "${YELLOW}⚠️  /health/ready falhou (esperado se DB não acessível)${NC}"
    echo "Resposta:"
    cat /tmp/ready.json 2>/dev/null || echo "Sem resposta"
fi

echo ""
echo "=== FASE 5: Limpeza ==="
docker rm -f ${CONTAINER_NAME}
echo -e "${GREEN}✅ Container removido${NC}"

echo ""
echo "=== RESUMO ==="
echo -e "${GREEN}✅ Build: OK${NC}"
echo -e "${GREEN}✅ Container: OK${NC}"
echo -e "${GREEN}✅ /health: OK${NC}"
echo ""
echo "=== TESTE CONCLUÍDO COM SUCESSO ==="
