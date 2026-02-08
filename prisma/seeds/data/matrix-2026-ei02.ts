import { CampoDeExperiencia } from '@prisma/client';

export const matrixDataEI02 = {
  name: "Matriz Curricular 2026 - Crianças Bem Pequenas",
  year: 2026,
  segment: "EI02",
  entries: [
    // SEMANA 1 (Adaptação)
    {
      date: "2026-02-09T00:00:00Z",
      campo: CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS,
      code: "EI02EO02",
      bncc: "Demonstrar imagem positiva de si e confiança em sua capacidade para enfrentar dificuldades e desafios.",
      curriculo: "Perceber sua imagem no espelho e em diferentes fotografias.",
      intencionalidade: "Favorecer a construção da identidade pessoal e o reconhecimento de si.",
      week: 7
    },
    {
      date: "2026-02-10T00:00:00Z",
      campo: CampoDeExperiencia.CORPO_GESTOS_E_MOVIMENTOS,
      code: "EI02CG04",
      bncc: "Demonstrar progressiva independência no cuidado do seu corpo.",
      curriculo: "Cuidar de sua higiene, alimentação, conforto e aparência.",
      intencionalidade: "Favorecer a autonomia e o protagonismo nas ações cotidianas.",
      week: 7
    },
    {
      date: "2026-02-11T00:00:00Z",
      campo: CampoDeExperiencia.TRACOS_SONS_CORES_E_FORMAS,
      code: "EI02TS02",
      bncc: "Utilizar materiais variados com possibilidades de manipulação (argila, massa de modelar), explorando cores, texturas...",
      curriculo: "Reconhecer as cores primárias e secundárias.",
      intencionalidade: "Estimular a exploração sensorial e estética.",
      week: 7
    },
    // SEMANA 2 (Continuação)
    {
      date: "2026-02-19T00:00:00Z",
      campo: CampoDeExperiencia.ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO,
      code: "EI02EF01",
      bncc: "Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita.",
      curriculo: "Reconhecer e utilizar diferentes formas de expressão para se comunicar.",
      intencionalidade: "Ampliar as capacidades comunicativas não verbais.",
      week: 8
    },
    {
      date: "2026-02-20T00:00:00Z",
      campo: CampoDeExperiencia.ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES,
      code: "EI02ET05",
      bncc: "Classificar objetos e figuras de acordo com suas semelhanças e diferenças.",
      curriculo: "Estabelecer relações de comparação entre objetos.",
      intencionalidade: "Estimular o pensamento lógico-matemático através da observação de atributos físicos.",
      week: 8
    }
  ]
};
