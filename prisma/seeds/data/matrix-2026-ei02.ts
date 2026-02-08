import { CampoDeExperiencia } from '@prisma/client';

/**
 * Dados da Matriz Curricular 2026 - EI02 (Semanas 1-4)
 * 
 * Fonte: Currículo em Movimento do Distrito Federal - Educação Infantil
 * Segmento: EI02 (Bebês de 1 ano a 1 ano e 11 meses)
 * Período: Semanas 1-4 do ano letivo 2026
 */
export const matrixDataEI02 = {
  matrix: {
    name: 'Matriz Curricular EI02 - 2026',
    year: 2026,
    segment: 'EI02',
    version: 1,
    description: 'Matriz curricular para bebês de 1 ano a 1 ano e 11 meses, baseada no Currículo em Movimento do Distrito Federal',
    sourceUrl: 'https://www.educacao.df.gov.br/curriculo-em-movimento/',
  },
  entries: [
    // Semana 1 - Segunda-feira (06/01/2026)
    {
      date: '2026-01-06',
      weekOfYear: 1,
      dayOfWeek: 1,
      bimester: 1,
      campoDeExperiencia: CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS,
      objetivoBNCC: 'Perceber que suas ações têm efeitos nas outras crianças e nos adultos.',
      objetivoBNCCCode: 'EI02EO01',
      objetivoCurriculo: 'Vivenciar experiências que possibilitem perceber que suas ações têm efeitos nas outras crianças e nos adultos, desenvolvendo a consciência de si e do outro.',
      intencionalidade: 'Promover interações que permitam ao bebê perceber a relação causa-efeito de suas ações no ambiente e nas pessoas ao seu redor.',
      exemploAtividade: 'Brincadeiras de esconde-esconde com objetos e pessoas, jogos de imitação de gestos e sons, atividades com espelhos.',
    },
    // Semana 1 - Terça-feira (07/01/2026)
    {
      date: '2026-01-07',
      weekOfYear: 1,
      dayOfWeek: 2,
      bimester: 1,
      campoDeExperiencia: CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS,
      objetivoBNCC: 'Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras.',
      objetivoBNCCCode: 'EI02CG01',
      objetivoCurriculo: 'Explorar e apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras, desenvolvendo autonomia e coordenação motora.',
      intencionalidade: 'Estimular a exploração de movimentos corporais diversos, favorecendo o desenvolvimento motor e a expressão corporal.',
      exemploAtividade: 'Circuitos motores com obstáculos, brincadeiras de roda, danças e cantigas de roda.',
    },
    // Semana 1 - Quarta-feira (08/01/2026)
    {
      date: '2026-01-08',
      weekOfYear: 1,
      dayOfWeek: 3,
      bimester: 1,
      campoDeExperiencia: CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS,
      objetivoBNCC: 'Criar sons com materiais, objetos e instrumentos musicais, para acompanhar diversos ritmos de música.',
      objetivoBNCCCode: 'EI02TS01',
      objetivoCurriculo: 'Explorar e criar sons com materiais, objetos e instrumentos musicais diversos, desenvolvendo a percepção auditiva e o senso rítmico.',
      intencionalidade: 'Proporcionar experiências sonoras variadas que estimulem a percepção auditiva e a criatividade musical.',
      exemploAtividade: 'Exploração de instrumentos musicais simples (chocalhos, tambores), brincadeiras com sons da natureza, canções com gestos.',
    },
    // Semana 1 - Quinta-feira (09/01/2026)
    {
      date: '2026-01-09',
      weekOfYear: 1,
      dayOfWeek: 4,
      bimester: 1,
      campoDeExperiencia: CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO,
      objetivoBNCC: 'Dialogar com crianças e adultos, expressando seus desejos, necessidades, sentimentos e opiniões.',
      objetivoBNCCCode: 'EI02EF01',
      objetivoCurriculo: 'Participar de situações de comunicação oral, expressando desejos, necessidades, sentimentos e opiniões por meio de diferentes linguagens.',
      intencionalidade: 'Criar oportunidades para que os bebês se expressem verbalmente e não-verbalmente, ampliando suas formas de comunicação.',
      exemploAtividade: 'Rodas de conversa, contação de histórias com fantoches, brincadeiras de telefone sem fio adaptadas.',
    },
    // Semana 1 - Sexta-feira (10/01/2026)
    {
      date: '2026-01-10',
      weekOfYear: 1,
      dayOfWeek: 5,
      bimester: 1,
      campoDeExperiencia: CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES,
      objetivoBNCC: 'Explorar e descrever semelhanças e diferenças entre as características e propriedades dos objetos (textura, massa, tamanho).',
      objetivoBNCCCode: 'EI02ET01',
      objetivoCurriculo: 'Explorar objetos e materiais diversos, identificando características e propriedades como textura, massa, tamanho, forma e cor.',
      intencionalidade: 'Estimular a exploração sensorial e a observação de características dos objetos, desenvolvendo o pensamento lógico-matemático.',
      exemploAtividade: 'Caixas sensoriais com diferentes texturas, brincadeiras de empilhar e encaixar, exploração de objetos grandes e pequenos.',
    },
  ],
};
