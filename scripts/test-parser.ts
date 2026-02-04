/**
 * Script de teste do parser da Matriz Curricular 2026
 * 
 * Uso:
 *   npx ts-node scripts/test-parser.ts [caminho-do-pdf]
 */

import { CurriculumPdfParserService } from '../src/curriculum-import/curriculum-pdf-parser.service';
import * as path from 'path';

async function main() {
  const pdfPath = process.argv[2] || path.join(__dirname, '..', 'matriz-2026.pdf');
  
  console.log('='.repeat(80));
  console.log('TESTE DO PARSER DA MATRIZ CURRICULAR 2026');
  console.log('='.repeat(80));
  console.log(`\nArquivo: ${pdfPath}\n`);
  
  const parser = new CurriculumPdfParserService();
  
  try {
    console.log('⏳ Iniciando parsing...\n');
    const startTime = Date.now();
    
    const result = await parser.parsePdf(pdfPath);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ PARSING CONCLUÍDO COM SUCESSO\n');
    console.log(`⏱️  Tempo: ${duration}s`);
    console.log(`📊 Total de entradas extraídas: ${result.totalExtracted}`);
    console.log(`⚠️  Total de erros/avisos: ${result.errors.length}\n`);
    
    // Exibir erros se houver
    if (result.errors.length > 0) {
      console.log('─'.repeat(80));
      console.log('ERROS E AVISOS:');
      console.log('─'.repeat(80));
      result.errors.slice(0, 10).forEach((error, idx) => {
        console.log(`${idx + 1}. ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`... e mais ${result.errors.length - 10} erros/avisos`);
      }
      console.log();
    }
    
    // Estatísticas
    console.log('─'.repeat(80));
    console.log('ESTATÍSTICAS:');
    console.log('─'.repeat(80));
    
    const byBimester = result.entries.reduce((acc, entry) => {
      const bim = entry.bimester || 0;
      acc[bim] = (acc[bim] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const byCampo = result.entries.reduce((acc, entry) => {
      acc[entry.campoDeExperiencia] = (acc[entry.campoDeExperiencia] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nPor Bimestre:');
    Object.entries(byBimester).sort().forEach(([bim, count]) => {
      console.log(`  ${bim}º Bimestre: ${count} entradas`);
    });
    
    console.log('\nPor Campo de Experiência:');
    Object.entries(byCampo).forEach(([campo, count]) => {
      console.log(`  ${campo}: ${count} entradas`);
    });
    
    // Preview das primeiras 5 entradas
    console.log('\n' + '─'.repeat(80));
    console.log('PREVIEW DAS PRIMEIRAS 5 ENTRADAS:');
    console.log('─'.repeat(80));
    
    result.entries.slice(0, 5).forEach((entry, idx) => {
      console.log(`\n[${idx + 1}] ${formatDate(entry.date)} (Semana ${entry.weekOfYear}, ${getDayName(entry.dayOfWeek)})`);
      console.log(`    Bimestre: ${entry.bimester}º`);
      console.log(`    Campo: ${entry.campoDeExperiencia}`);
      console.log(`    Código BNCC: ${entry.objetivoBNCCCode || 'N/A'}`);
      console.log(`    Objetivo BNCC: ${truncate(entry.objetivoBNCC, 80)}`);
      console.log(`    Objetivo Currículo: ${truncate(entry.objetivoCurriculo, 80)}`);
      if (entry.intencionalidade) {
        console.log(`    Intencionalidade: ${truncate(entry.intencionalidade, 80)}`);
      }
      if (entry.exemploAtividade) {
        console.log(`    Exemplo: ${truncate(entry.exemploAtividade, 80)}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTE CONCLUÍDO');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERRO NO PARSING:\n');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function getDayName(dayOfWeek: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[dayOfWeek] || 'N/A';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

main();
