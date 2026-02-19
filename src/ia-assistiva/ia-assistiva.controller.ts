import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { IaAssistivaService } from './ia-assistiva.service';
import { GerarAtividadeDto } from './dto/gerar-atividade.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IaAssistivaController {
  constructor(private readonly iaService: IaAssistivaService) {}

  /**
   * POST /ia/gerar-atividade
   * Gera uma atividade pedagógica completa alinhada à Sequência Piloto 2026.
   *
   * Acesso: Professor, Unidade, Mantenedora, Developer
   *
   * REGRA: O Campo de Experiência e os Objetivos (BNCC + Currículo) são FIXOS
   * e devem vir da Sequência Piloto. A IA apenas cria a atividade.
   */
  @Post('gerar-atividade')
  @HttpCode(HttpStatus.OK)
  gerarAtividade(
    @Body() dto: GerarAtividadeDto,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.iaService.gerarAtividade(dto);
  }

  /**
   * POST /ia/microgestos
   * Gera sugestões de microgestos pedagógicos para um aluno específico.
   *
   * Acesso: Professor, Unidade, Mantenedora, Developer
   */
  @Post('microgestos')
  @HttpCode(HttpStatus.OK)
  gerarMicrogestos(
    @Body()
    body: {
      nomeAluno: string;
      faixaEtaria: string;
      observacoes: string;
      campoDeExperiencia: string;
    },
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.iaService.gerarMicrogestos(body);
  }

  /**
   * POST /ia/relatorio-aluno
   * Gera um relatório de desenvolvimento de um aluno baseado em observações.
   *
   * Acesso: Professor, Unidade, Mantenedora, Developer
   */
  @Post('relatorio-aluno')
  @HttpCode(HttpStatus.OK)
  gerarRelatorioAluno(
    @Body()
    body: {
      nomeAluno: string;
      faixaEtaria: string;
      observacoes: string[];
      periodo: string;
    },
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.iaService.gerarRelatorioAluno(body);
  }
}
