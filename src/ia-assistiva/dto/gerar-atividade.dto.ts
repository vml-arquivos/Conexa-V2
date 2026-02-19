import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';

export enum FaixaEtaria {
  EI01 = 'EI01', // Bebês (0 a 1 ano e 6 meses)
  EI02 = 'EI02', // Crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)
  EI03 = 'EI03', // Crianças pequenas (4 anos a 5 anos e 11 meses)
}

export enum TipoAtividade {
  RODA_DE_CONVERSA = 'RODA_DE_CONVERSA',
  EXPLORACAO_SENSORIAL = 'EXPLORACAO_SENSORIAL',
  ATIVIDADE_PLASTICA = 'ATIVIDADE_PLASTICA',
  BRINCADEIRA_DIRIGIDA = 'BRINCADEIRA_DIRIGIDA',
  LEITURA_COMPARTILHADA = 'LEITURA_COMPARTILHADA',
  MUSICA_E_MOVIMENTO = 'MUSICA_E_MOVIMENTO',
  JOGO_SIMBOLICO = 'JOGO_SIMBOLICO',
  INVESTIGACAO = 'INVESTIGACAO',
  SEQUENCIA_DIDATICA = 'SEQUENCIA_DIDATICA',
  LIVRE = 'LIVRE',
}

export class GerarAtividadeDto {
  /** Campo de Experiência da BNCC (vem da Sequência Piloto — IMUTÁVEL) */
  @IsString()
  @IsNotEmpty()
  campoDeExperiencia: string;

  /** Objetivo da BNCC (vem da Sequência Piloto — IMUTÁVEL) */
  @IsString()
  @IsNotEmpty()
  objetivoBNCC: string;

  /** Objetivo do Currículo em Movimento DF (vem da Sequência Piloto — IMUTÁVEL) */
  @IsString()
  @IsNotEmpty()
  objetivoCurriculo: string;

  /** Faixa etária da turma */
  @IsEnum(FaixaEtaria)
  faixaEtaria: FaixaEtaria;

  /** Tipo de atividade desejado (opcional — se não informado, a IA escolhe) */
  @IsOptional()
  @IsEnum(TipoAtividade)
  tipoAtividade?: TipoAtividade;

  /** Número de crianças na turma */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  numeroCriancas?: number;

  /** Contexto adicional do professor (ex: "temos poucos materiais", "crianças agitadas hoje") */
  @IsOptional()
  @IsString()
  contextoAdicional?: string;

  /** ID da entrada da matriz curricular (para vincular ao planejamento) */
  @IsOptional()
  @IsString()
  matrizEntradaId?: string;
}
