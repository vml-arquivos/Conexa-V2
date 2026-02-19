import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import { GerarAtividadeDto, FaixaEtaria, TipoAtividade } from './dto/gerar-atividade.dto';

export interface AtividadeGerada {
  titulo: string;
  descricao: string;
  intencionalidade: string;
  materiais: string[];
  etapas: string[];
  duracao: string;
  adaptacoes: string;
  registroSugerido: string;
  campoDeExperiencia: string;
  objetivoBNCC: string;
  objetivoCurriculo: string;
  faixaEtaria: string;
  geradoPorIA: true;
}

const LABELS_FAIXA: Record<FaixaEtaria, string> = {
  [FaixaEtaria.EI01]: 'Bebês (0 a 1 ano e 6 meses)',
  [FaixaEtaria.EI02]: 'Crianças Bem Pequenas (1 ano e 7 meses a 3 anos e 11 meses)',
  [FaixaEtaria.EI03]: 'Crianças Pequenas (4 anos a 5 anos e 11 meses)',
};

const LABELS_TIPO: Record<TipoAtividade, string> = {
  [TipoAtividade.RODA_DE_CONVERSA]: 'Roda de Conversa',
  [TipoAtividade.EXPLORACAO_SENSORIAL]: 'Exploração Sensorial',
  [TipoAtividade.ATIVIDADE_PLASTICA]: 'Atividade Plástica',
  [TipoAtividade.BRINCADEIRA_DIRIGIDA]: 'Brincadeira Dirigida',
  [TipoAtividade.LEITURA_COMPARTILHADA]: 'Leitura Compartilhada',
  [TipoAtividade.MUSICA_E_MOVIMENTO]: 'Música e Movimento',
  [TipoAtividade.JOGO_SIMBOLICO]: 'Jogo Simbólico',
  [TipoAtividade.INVESTIGACAO]: 'Investigação',
  [TipoAtividade.SEQUENCIA_DIDATICA]: 'Sequência Didática',
  [TipoAtividade.LIVRE]: 'Livre',
};

// ============================================================================
// CONFIGURAÇÃO DO PROVEDOR DE IA
// ============================================================================
// O sistema usa a API do Google Gemini como padrão, via interface compatível
// com OpenAI. Para trocar o provedor, basta alterar as variáveis de ambiente
// no Coolify — sem necessidade de alterar o código.
//
// Variáveis de ambiente:
//   GEMINI_API_KEY  → Chave da API do Google AI Studio (obrigatória para IA)
//   GEMINI_BASE_URL → URL base (padrão: https://generativelanguage.googleapis.com/v1beta/openai/)
//   GEMINI_MODEL    → Modelo (padrão: gemini-2.5-flash)
//
// Compatibilidade retroativa (se GEMINI_API_KEY não estiver definida, tenta OPENAI_API_KEY):
//   OPENAI_API_KEY  → Chave da OpenAI (fallback)
//   OPENAI_BASE_URL → URL base da OpenAI (fallback)
//   OPENAI_MODEL    → Modelo da OpenAI (fallback)
// ============================================================================

@Injectable()
export class IaAssistivaService {
  private readonly logger = new Logger(IaAssistivaService.name);
  // Inicialização LAZY: o cliente só é criado quando realmente for usado.
  // Isso garante que o servidor sobe normalmente mesmo sem chave de IA configurada.
  private _cliente: OpenAI | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      this.logger.log(
        'IA Assistiva: GEMINI_API_KEY detectada — usando Google Gemini como provedor de IA.',
      );
    } else if (openaiKey) {
      this.logger.log(
        'IA Assistiva: OPENAI_API_KEY detectada — usando OpenAI como provedor de IA (fallback).',
      );
    } else {
      this.logger.warn(
        'IA Assistiva: Nenhuma chave de IA configurada (GEMINI_API_KEY ou OPENAI_API_KEY). ' +
        'O servidor funciona normalmente. Endpoints de IA retornarão 503 até uma chave ser adicionada.',
      );
    }
  }

  /**
   * Retorna o cliente de IA (lazy init).
   * Prioridade: Gemini > OpenAI
   * Lança ServiceUnavailableException se nenhuma chave estiver configurada.
   */
  private getCliente(): OpenAI {
    if (this._cliente) return this._cliente;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      // Gemini via API compatível com OpenAI
      this._cliente = new OpenAI({
        apiKey: geminiKey,
        baseURL:
          process.env.GEMINI_BASE_URL ||
          'https://generativelanguage.googleapis.com/v1beta/openai/',
      });
      return this._cliente;
    }

    if (openaiKey) {
      // OpenAI como fallback
      this._cliente = new OpenAI({
        apiKey: openaiKey,
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      });
      return this._cliente;
    }

    throw new ServiceUnavailableException(
      'O módulo de IA não está configurado neste ambiente. ' +
      'Adicione a variável GEMINI_API_KEY nas configurações do servidor no Coolify.',
    );
  }

  /**
   * Retorna o nome do modelo a ser usado.
   * Prioridade: GEMINI_MODEL > OPENAI_MODEL > gemini-2.5-flash (padrão)
   */
  private getModelo(): string {
    return (
      process.env.GEMINI_MODEL ||
      process.env.OPENAI_MODEL ||
      'gemini-2.5-flash'
    );
  }

  /**
   * Gera uma atividade pedagógica completa alinhada à Sequência Piloto 2026.
   *
   * REGRA DE OURO: O Campo de Experiência, o Objetivo BNCC e o Objetivo do
   * Currículo em Movimento são FIXOS e vêm da Sequência Piloto. A IA APENAS
   * cria a atividade/experiência para atingir esses objetivos.
   */
  async gerarAtividade(dto: GerarAtividadeDto): Promise<AtividadeGerada> {
    const cliente = this.getCliente();
    const faixaLabel = LABELS_FAIXA[dto.faixaEtaria] || dto.faixaEtaria;
    const tipoLabel = dto.tipoAtividade
      ? LABELS_TIPO[dto.tipoAtividade]
      : 'à sua escolha (sugira o mais adequado)';

    const prompt = `Você é uma especialista em Educação Infantil, com profundo conhecimento na BNCC e no Currículo em Movimento do Distrito Federal.

Sua tarefa é criar UMA atividade pedagógica completa e detalhada para professores de Educação Infantil.

## CONTEXTO FIXO (NÃO ALTERE ESTES DADOS — vêm da Sequência Piloto 2026)
- **Campo de Experiência:** ${dto.campoDeExperiencia}
- **Objetivo BNCC:** ${dto.objetivoBNCC}
- **Objetivo do Currículo em Movimento DF:** ${dto.objetivoCurriculo}

## DADOS DA TURMA
- **Faixa Etária:** ${faixaLabel}
- **Tipo de Atividade:** ${tipoLabel}
- **Número de Crianças:** ${dto.numeroCriancas ? dto.numeroCriancas + ' crianças' : 'não informado'}
${dto.contextoAdicional ? `- **Contexto Adicional:** ${dto.contextoAdicional}` : ''}

## INSTRUÇÕES
1. Crie uma atividade CRIATIVA, LÚDICA e ADEQUADA à faixa etária informada.
2. A atividade deve ser DIRETAMENTE alinhada ao Campo de Experiência e aos objetivos acima.
3. Use linguagem simples e direta, como se estivesse escrevendo para a professora executar em sala.
4. Considere a realidade de uma escola pública do DF com recursos básicos.
5. Inclua adaptações para crianças com necessidades especiais.

## FORMATO DE RESPOSTA (JSON VÁLIDO — sem markdown, sem explicações fora do JSON)
{
  "titulo": "Título criativo da atividade",
  "descricao": "Descrição geral da atividade em 2-3 frases",
  "intencionalidade": "O que o professor pretende alcançar com esta atividade (1-2 frases)",
  "materiais": ["material 1", "material 2", "material 3"],
  "etapas": [
    "1. Primeira etapa detalhada",
    "2. Segunda etapa detalhada",
    "3. Terceira etapa detalhada"
  ],
  "duracao": "Duração estimada (ex: 30 a 40 minutos)",
  "adaptacoes": "Sugestões de adaptação para crianças com necessidades especiais ou diferentes ritmos",
  "registroSugerido": "Como o professor pode registrar e documentar esta atividade (fotos, portfólio, diário, etc.)"
}`;

    try {
      const resposta = await cliente.chat.completions.create({
        model: this.getModelo(),
        messages: [
          {
            role: 'system',
            content:
              'Você é uma especialista em Educação Infantil brasileira. Responda APENAS com JSON válido, sem markdown, sem texto adicional.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const conteudo = resposta.choices[0]?.message?.content;
      if (!conteudo) {
        throw new ServiceUnavailableException(
          'A IA não retornou conteúdo. Tente novamente.',
        );
      }

      // Extrair JSON mesmo que venha com markdown
      const jsonLimpo = conteudo
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const atividade = JSON.parse(jsonLimpo);

      // Garantir que os campos fixos da Sequência Piloto sejam preservados
      return {
        ...atividade,
        campoDeExperiencia: dto.campoDeExperiencia,
        objetivoBNCC: dto.objetivoBNCC,
        objetivoCurriculo: dto.objetivoCurriculo,
        faixaEtaria: faixaLabel,
        geradoPorIA: true,
      };
    } catch (error) {
      this.logger.error('Erro ao gerar atividade com IA:', error);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
      );
    }
  }

  /**
   * Gera sugestões de microgestos pedagógicos para um aluno específico
   * baseado em observações do professor.
   */
  async gerarMicrogestos(params: {
    nomeAluno: string;
    faixaEtaria: string;
    observacoes: string;
    campoDeExperiencia: string;
  }): Promise<{ microgestos: string[]; justificativa: string }> {
    const cliente = this.getCliente();

    const prompt = `Você é uma especialista em Educação Infantil e desenvolvimento infantil.

Com base nas observações abaixo sobre uma criança, sugira 3 a 5 MICROGESTOS PEDAGÓGICOS que o professor pode fazer para apoiar o desenvolvimento desta criança.

**Criança:** ${params.nomeAluno}
**Faixa Etária:** ${params.faixaEtaria}
**Campo de Experiência em foco:** ${params.campoDeExperiencia}
**Observações do Professor:** ${params.observacoes}

Microgestos são ações pequenas, intencionais e imediatas que o professor faz durante a rotina para apoiar o desenvolvimento individual da criança.

Responda em JSON:
{
  "microgestos": [
    "Microgesto 1 — ação específica e concreta",
    "Microgesto 2",
    "Microgesto 3"
  ],
  "justificativa": "Breve justificativa pedagógica para estas sugestões"
}`;

    try {
      const resposta = await cliente.chat.completions.create({
        model: this.getModelo(),
        messages: [
          {
            role: 'system',
            content:
              'Você é especialista em Educação Infantil brasileira. Responda APENAS com JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 800,
      });

      const conteudo = resposta.choices[0]?.message?.content;
      if (!conteudo) {
        throw new ServiceUnavailableException('IA sem resposta. Tente novamente.');
      }
      const jsonLimpo = conteudo
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(jsonLimpo);
    } catch (error) {
      this.logger.error('Erro ao gerar microgestos:', error);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Serviço de IA temporariamente indisponível.',
      );
    }
  }

  /**
   * Gera um relatório de desenvolvimento de um aluno baseado em observações
   * do diário do professor.
   */
  async gerarRelatorioAluno(params: {
    nomeAluno: string;
    faixaEtaria: string;
    observacoes: string[];
    periodo: string;
  }): Promise<{ relatorio: string; pontosFortess: string[]; sugestoes: string[] }> {
    const cliente = this.getCliente();
    const observacoesTexto = params.observacoes
      .map((o, i) => `${i + 1}. ${o}`)
      .join('\n');

    const prompt = `Você é uma especialista em Educação Infantil e avaliação formativa.

Com base nas observações do professor durante o período indicado, elabore um relatório de desenvolvimento da criança.

**Criança:** ${params.nomeAluno}
**Faixa Etária:** ${params.faixaEtaria}
**Período:** ${params.periodo}
**Observações registradas:**
${observacoesTexto}

Responda em JSON:
{
  "relatorio": "Texto do relatório em linguagem acessível para os responsáveis (3-4 parágrafos)",
  "pontosFortess": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
  "sugestoes": ["Sugestão de continuidade 1", "Sugestão 2"]
}`;

    try {
      const resposta = await cliente.chat.completions.create({
        model: this.getModelo(),
        messages: [
          {
            role: 'system',
            content:
              'Você é especialista em Educação Infantil brasileira. Responda APENAS com JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      });

      const conteudo = resposta.choices[0]?.message?.content;
      if (!conteudo) {
        throw new ServiceUnavailableException('IA sem resposta. Tente novamente.');
      }
      const jsonLimpo = conteudo
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(jsonLimpo);
    } catch (error) {
      this.logger.error('Erro ao gerar relatório:', error);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Serviço de IA temporariamente indisponível.',
      );
    }
  }
}
