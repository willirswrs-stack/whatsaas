/**
 * WhatSaas - Frontend Page Validation Script
 * 
 * Este script testa todas as páginas do frontend para garantir que carregam corretamente.
 */

const FRONTEND_BASE = 'http://localhost:3000';

interface PageTestResult {
    page: string;
    url: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    statusCode?: number;
    message: string;
    duration: number;
}

const results: PageTestResult[] = [];

async function testPage(name: string, path: string): Promise<PageTestResult> {
    const start = Date.now();
    const url = `${FRONTEND_BASE}${path}`;

    try {
        const response = await fetch(url);
        const duration = Date.now() - start;

        // Para Next.js, qualquer status 2xx ou redirect 3xx é considerado sucesso
        const isSuccess = response.status >= 200 && response.status < 400;

        return {
            page: name,
            url: path,
            status: isSuccess ? 'PASS' : 'FAIL',
            statusCode: response.status,
            message: isSuccess ? 'Carregou OK' : `Status ${response.status}`,
            duration,
        };
    } catch (error: any) {
        return {
            page: name,
            url: path,
            status: 'FAIL',
            message: error.message || 'Erro de conexão',
            duration: Date.now() - start,
        };
    }
}

function logResult(result: PageTestResult) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    const status = result.statusCode ? ` [${result.statusCode}]` : '';
    console.log(`${icon} ${result.page.padEnd(25)} ${result.url.padEnd(30)}${status} (${result.duration}ms)`);
    results.push(result);
}

async function runTests() {
    console.log('═'.repeat(80));
    console.log('🌐 WhatSaas - Validação de Páginas Frontend');
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}`);
    console.log(`🔗 ${FRONTEND_BASE}`);
    console.log('═'.repeat(80));
    console.log();

    const pages = [
        { name: 'Home / Dashboard', path: '/' },
        { name: 'Login', path: '/login' },
        { name: 'Chips (Instances)', path: '/chips' },
        { name: 'Campanhas', path: '/campaigns' },
        { name: 'Contatos', path: '/contatos' },
        { name: 'Templates', path: '/templates' },
        { name: 'Templates Meta', path: '/templates-meta' },
        { name: 'Fluxos', path: '/flows' },
        { name: 'Analytics', path: '/analytics' },
        { name: 'Configurações', path: '/configuracoes' },
        { name: 'Anti-Ban', path: '/antiban' },
        { name: 'Warmup', path: '/warmup' },
        { name: 'AI Spinner', path: '/ai-spinner' },
        { name: 'Proxies', path: '/proxies' },
        { name: 'Admin AI Agent', path: '/admin/ai-agent' },
    ];

    console.log('📄 Testando páginas...\n');

    for (const page of pages) {
        const result = await testPage(page.name, page.path);
        logResult(result);
    }

    // Summary
    console.log();
    console.log('═'.repeat(80));
    console.log('📊 RESUMO DA VALIDAÇÃO FRONTEND');
    console.log('═'.repeat(80));

    const passed = results.filter(r => r.status === 'PASS').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const total = results.length;

    console.log(`\n✅ CARREGOU:  ${passed}/${total}`);
    console.log(`⚠️  AVISO:     ${warned}/${total}`);
    console.log(`❌ FALHOU:    ${failed}/${total}`);

    if (failed > 0) {
        console.log('\n🔴 PÁGINAS COM FALHA:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.page} (${r.url}): ${r.message}`);
        });
    }

    const avgDuration = Math.round(results.reduce((acc, r) => acc + r.duration, 0) / total);
    console.log(`\n⏱️  Tempo médio de carregamento: ${avgDuration}ms`);
    console.log('═'.repeat(80));

    if (failed === 0) {
        console.log('\n🎉 TODAS AS PÁGINAS ESTÃO CARREGANDO CORRETAMENTE!\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  EXISTEM PÁGINAS COM PROBLEMAS.\n');
        process.exit(1);
    }
}

runTests().catch(console.error);
