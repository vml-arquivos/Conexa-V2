import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { CampoDeExperiencia } from '@prisma/client';

/**
 * Interface para uma entrada extraída do PDF
 */
export interface ParsedMatrixEntry {
  date: Date;
  weekOfYear: number;
  dayOfWeek: number;
  bimester?: number;
  campoDeExperiencia: CampoDeExperiencia;
  objetivoBNCC: string;
  objetivoBNCCCode?: string;
  objetivoCurriculo: string;
  intencionalidade?: string;
  exemploAtividade?: string;
}

/**
 * Resultado do parsing do PDF
 */
export interface ParserResult {
  entries: ParsedMatrixEntry[];
  totalExtracted: number;
  errors: string[];
}

@Injectable()
export class CurriculumPdfParserService {
  /**
   * Parse do PDF da Matriz Curricular 2026
   * 
   * @param pdfPath - Caminho do arquivo PDF
   * @returns Resultado do parsing com entradas extraídas
   */
  async parsePdf(pdfPath: string): Promise<ParserResult> {
    try {
      // Verificar se arquivo existe
      if (!fs.existsSync(pdfPath)) {
        throw new BadRequestException(`Arquivo PDF não encontrado: ${pdfPath}`);
      }

      // Extrair texto do PDF usando pdf-parse v2
      const parser = new PDFParse({ url: pdfPath });
      const result = await parser.getText();
      const text = result.text;

      if (!text || text.trim().length === 0) {
        throw new BadRequestException('PDF está vazio ou não contém texto extraível');
      }

      // Parse do conteúdo
      const { entries, errors } = this.extractEntries(text);

      if (entries.length === 0) {
        throw new BadRequestException(
          'Nenhuma entrada válida foi encontrada no PDF. Verifique o formato do arquivo.',
        );
      }

      return {
        entries,
        totalExtracted: entries.length,
        errors,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Erro ao fazer parse do PDF: ${error.message}`,
      );
    }
  }

  /**
   * Extrai entradas do texto do PDF da Matriz Curricular 2026
   * 
   * Estratégia: dividir texto em blocos por data, depois parsear cada bloco
   * 
   * @param text - Texto extraído do PDF
   * @returns Array de entradas parseadas e lista de erros
   */
  private extractEntries(text: string): { entries: ParsedMatrixEntry[]; errors: string[] } {
    const entries: ParsedMatrixEntry[] = [];
    const errors: string[] = [];
    const seenDates = new Set<string>();
    
    // Detectar contexto (semana e bimestre)
    const weekPattern = /SEMANA\s+(\d+)/gi;
    const bimesterPattern = /(\d+)º\s+BIMESTRE/gi;
    
    let currentWeek = 1;
    let currentBimester = 1;
    const currentYear = 2026;
    
    // Dividir texto em blocos por data (DD/MM\n– Dia)
    const dateBlockPattern = /(\d{2})\/(\d{2})\s*\n\s*[–-]\s*(\w{3})/g;
    const blocks: Array<{ date: Date; dayOfWeek: number; text: string; lineStart: number }> = [];
    
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = dateBlockPattern.exec(text)) !== null) {
      const [fullMatch, day, month, dayAbbrev] = match;
      const matchIndex = match.index;
      
      // Salvar bloco anterior se existir
      if (blocks.length > 0) {
        blocks[blocks.length - 1].text = text.substring(lastIndex, matchIndex);
      }
      
      // Criar novo bloco
      try {
        const date = new Date(`${currentYear}-${month}-${day}T00:00:00-03:00`);
        
        if (!isNaN(date.getTime())) {
          const dayOfWeek = this.parseDayOfWeek(dayAbbrev);
          
          blocks.push({
            date,
            dayOfWeek,
            text: '',
            lineStart: text.substring(0, matchIndex).split('\n').length,
          });
          
          lastIndex = matchIndex + fullMatch.length;
        }
      } catch (error) {
        errors.push(`Erro ao parsear data ${day}/${month}: ${error.message}`);
      }
    }
    
    // Salvar último bloco
    if (blocks.length > 0) {
      blocks[blocks.length - 1].text = text.substring(lastIndex);
    }
    
    // Parsear cada bloco
    for (const block of blocks) {
      // Detectar semana e bimestre no contexto anterior
      const contextText = text.substring(Math.max(0, text.indexOf(block.text) - 500), text.indexOf(block.text));
      
      let weekMatch: RegExpExecArray | null;
      weekPattern.lastIndex = 0;
      while ((weekMatch = weekPattern.exec(contextText)) !== null) {
        currentWeek = parseInt(weekMatch[1], 10);
      }
      
      let bimesterMatch: RegExpExecArray | null;
      bimesterPattern.lastIndex = 0;
      while ((bimesterMatch = bimesterPattern.exec(contextText)) !== null) {
        currentBimester = parseInt(bimesterMatch[1], 10);
      }
      
      try {
        const entry = this.parseBlock(block.text, block.date, block.dayOfWeek, currentWeek, currentBimester);
        
        const dateKey = entry.date.toISOString().split('T')[0];
        if (!seenDates.has(dateKey)) {
          entries.push(entry);
          seenDates.add(dateKey);
        } else {
          errors.push(`Linha ${block.lineStart}: Data duplicada ignorada: ${dateKey}`);
        }
      } catch (error) {
        errors.push(`Linha ${block.lineStart}: ${error.message}`);
      }
    }
    
    return { entries, errors };
  }

  /**
   * Parseia um bloco de texto correspondente a uma entrada
   */
  private parseBlock(
    text: string,
    date: Date,
    dayOfWeek: number,
    weekOfYear: number,
    bimester: number,
  ): ParsedMatrixEntry {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Remover linhas de cabeçalho e rodapé
    const cleanLines = lines.filter(l => 
      !l.includes('MATRIZ CURRICULAR') &&
      !l.includes('Associação Beneficente') &&
      !l.includes('-- ') &&
      !l.includes('of 204') &&
      !l.startsWith('Data ') &&
      !l.startsWith('Experiência')
    );
    
    // Extrair campo de experiência (primeiras linhas antes do código BNCC)
    let campoDeExperiencia: CampoDeExperiencia | null = null;
    let campoLines: string[] = [];
    let bnccStartIndex = -1;
    
    for (let i = 0; i < cleanLines.length; i++) {
      if (cleanLines[i].includes('(EI0')) {
        bnccStartIndex = i;
        break;
      }
      campoLines.push(cleanLines[i]);
    }
    
    if (campoLines.length > 0) {
      const campoText = campoLines.join(' ');
      try {
        campoDeExperiencia = this.normalizeCampoDeExperiencia(campoText);
      } catch (error) {
        throw new Error(`Campo de Experiência não reconhecido: ${campoText.substring(0, 50)}`);
      }
    }
    
    if (!campoDeExperiencia) {
      throw new Error('Campo de Experiência não encontrado');
    }
    
    // Extrair código BNCC e objetivos
    const bnccCodePattern = /\(([A-Z0-9]+)\)/;
    let objetivoBNCCCode: string | undefined;
    let objetivoBNCC = '';
    let objetivoCurriculo = '';
    let intencionalidade: string | undefined;
    let exemploAtividade: string | undefined;
    
    if (bnccStartIndex >= 0) {
      // Juntar linhas restantes
      const remainingText = cleanLines.slice(bnccStartIndex).join(' ');
      
      // Extrair código BNCC
      const codeMatch = remainingText.match(bnccCodePattern);
      if (codeMatch) {
        objetivoBNCCCode = codeMatch[1];
      }
      
      // Dividir texto em segmentos (heurística baseada em comprimento e padrões)
      const segments = this.splitIntoSegments(remainingText);
      
      if (segments.length >= 2) {
        objetivoBNCC = segments[0].replace(bnccCodePattern, '').trim();
        objetivoCurriculo = segments[1].trim();
        
        if (segments.length >= 3) {
          intencionalidade = segments[2].trim();
        }
        
        if (segments.length >= 4) {
          exemploAtividade = segments[3].trim();
        }
      } else {
        // Fallback: dividir por ponto final
        const parts = remainingText.split(/\.\s+/).filter(p => p.length > 10);
        if (parts.length >= 2) {
          objetivoBNCC = parts[0].replace(bnccCodePattern, '').trim() + '.';
          objetivoCurriculo = parts.slice(1).join('. ');
        } else {
          objetivoBNCC = remainingText.replace(bnccCodePattern, '').trim();
          objetivoCurriculo = remainingText.replace(bnccCodePattern, '').trim();
        }
      }
    }
    
    // Validar campos obrigatórios
    if (!objetivoBNCC || objetivoBNCC.length < 10) {
      throw new Error('Objetivo BNCC não encontrado ou inválido');
    }
    
    if (!objetivoCurriculo || objetivoCurriculo.length < 10) {
      throw new Error('Objetivo Currículo não encontrado ou inválido');
    }
    
    return {
      date,
      weekOfYear,
      dayOfWeek,
      bimester,
      campoDeExperiencia,
      objetivoBNCC,
      objetivoBNCCCode,
      objetivoCurriculo,
      intencionalidade,
      exemploAtividade,
    };
  }

  /**
   * Divide texto em segmentos (BNCC, Currículo, Intencionalidade, Exemplo)
   * Usa heurística baseada em palavras-chave e comprimento
   */
  private splitIntoSegments(text: string): string[] {
    const segments: string[] = [];
    
    // Remover código BNCC do início
    const bnccCodePattern = /\(([A-Z0-9]+)\)/;
    const cleanText = text.replace(bnccCodePattern, '').trim();
    
    // Dividir por frases (ponto final seguido de espaço e maiúscula)
    const sentences = cleanText.split(/\.\s+(?=[A-Z])/).map(s => s.trim() + '.');
    
    if (sentences.length === 0) {
      return [cleanText];
    }
    
    // Primeira frase: Objetivo BNCC
    segments.push(sentences[0]);
    
    // Restante: tentar identificar segmentos por palavras-chave
    let currentSegment = '';
    let segmentType: 'curriculo' | 'intencionalidade' | 'exemplo' = 'curriculo';
    
    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i];
      const lowerSentence = sentence.toLowerCase();
      
      // Detectar transição para intencionalidade
      if (segmentType === 'curriculo' && (
        lowerSentence.startsWith('favorecer') ||
        lowerSentence.startsWith('estimular') ||
        lowerSentence.startsWith('promover') ||
        lowerSentence.startsWith('incentivar') ||
        lowerSentence.startsWith('ampliar') ||
        lowerSentence.startsWith('desenvolver') ||
        lowerSentence.startsWith('fortalecer')
      )) {
        if (currentSegment) {
          segments.push(currentSegment.trim());
        }
        currentSegment = sentence;
        segmentType = 'intencionalidade';
        continue;
      }
      
      // Detectar transição para exemplo
      if (segmentType === 'intencionalidade' && (
        lowerSentence.includes('brincadeira') ||
        lowerSentence.includes('atividade') ||
        lowerSentence.includes('exploração') ||
        lowerSentence.includes('roda de') ||
        lowerSentence.includes('circuito') ||
        lowerSentence.includes('cesto') ||
        lowerSentence.includes('momento de')
      )) {
        if (currentSegment) {
          segments.push(currentSegment.trim());
        }
        currentSegment = sentence;
        segmentType = 'exemplo';
        continue;
      }
      
      // Acumular no segmento atual
      currentSegment += ' ' + sentence;
    }
    
    // Adicionar último segmento
    if (currentSegment) {
      segments.push(currentSegment.trim());
    }
    
    return segments;
  }

  /**
   * Parseia abreviação do dia da semana
   */
  private parseDayOfWeek(abbrev: string): number {
    const normalized = abbrev.toLowerCase().substring(0, 3);
    
    const days: Record<string, number> = {
      'seg': 1,
      'ter': 2,
      'qua': 3,
      'qui': 4,
      'sex': 5,
      'sáb': 6,
      'sab': 6,
      'dom': 0,
    };
    
    return days[normalized] || 1;
  }

  /**
   * Normaliza o campo de experiência para o enum
   */
  private normalizeCampoDeExperiencia(text: string): CampoDeExperiencia {
    const normalized = text.toLowerCase().trim();
    
    if (normalized.includes('eu') && (normalized.includes('outro') || normalized.includes('nós'))) {
      return CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS;
    }
    if (normalized.includes('corpo') || normalized.includes('gestos') || normalized.includes('movimentos')) {
      return CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS;
    }
    if (normalized.includes('traços') || normalized.includes('sons') || normalized.includes('cores') || normalized.includes('formas')) {
      return CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS;
    }
    if (normalized.includes('escuta') || normalized.includes('fala') || normalized.includes('pensamento') || normalized.includes('imaginação')) {
      return CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO;
    }
    if (normalized.includes('espaço') || normalized.includes('tempo') || normalized.includes('quantidade') || normalized.includes('relações') || normalized.includes('transformações')) {
      return CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES;
    }
    
    throw new Error(`Campo de Experiência não reconhecido: ${text}`);
  }
}
