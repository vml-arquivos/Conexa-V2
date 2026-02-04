/**
 * Utilitários de Data - Conexa
 * 
 * PADRONIZAÇÃO DE TIMEZONE:
 * - Todas as validações de "dia pedagógico" usam APP_TIMEZONE (America/Sao_Paulo)
 * - Logs podem estar em UTC, mas regras de negócio sempre usam o fuso pedagógico
 * - Comparações de data são feitas por "dia pedagógico" (YYYY-MM-DD) no fuso local
 */

/**
 * Extrai o "dia pedagógico" (YYYY-MM-DD) de uma data no fuso horário de São Paulo
 * 
 * @param date - Data a ser convertida
 * @returns String no formato YYYY-MM-DD no fuso pedagógico
 * 
 * @example
 * // Evento às 23:00 do dia 03/02 em São Paulo
 * const date = new Date('2026-02-03T23:00:00-03:00');
 * getPedagogicalDay(date); // "2026-02-03"
 * 
 * // Mesmo evento em UTC (02:00 do dia 04/02)
 * const dateUTC = new Date('2026-02-04T02:00:00Z');
 * getPedagogicalDay(dateUTC); // "2026-02-03" (convertido para SP)
 */
export function getPedagogicalDay(date: Date): string {
  const timezone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
  
  // Converter para o fuso pedagógico e extrair YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return formatter.format(date); // Retorna "YYYY-MM-DD"
}

/**
 * Compara se duas datas correspondem ao mesmo "dia pedagógico"
 * 
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns true se ambas as datas são do mesmo dia pedagógico
 * 
 * @example
 * const event = new Date('2026-02-03T23:00:00-03:00');
 * const entry = new Date('2026-02-04T02:00:00Z');
 * isSamePedagogicalDay(event, entry); // true (ambos são 03/02 em SP)
 */
export function isSamePedagogicalDay(date1: Date, date2: Date): boolean {
  return getPedagogicalDay(date1) === getPedagogicalDay(date2);
}

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY)
 * 
 * @param date - Data a ser formatada
 * @returns String no formato DD/MM/YYYY
 */
export function formatPedagogicalDate(date: Date): string {
  const timezone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
  
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return formatter.format(date);
}
