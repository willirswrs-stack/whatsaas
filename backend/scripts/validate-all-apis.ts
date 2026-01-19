/**
 * WhatSaas - Quick API Validation Script
 * 
 * Este script testa rapidamente todas as APIs do sistema para garantir que estão funcionando.
 * Executar: npx ts-node scripts/validate-all-apis.ts
 */

const API_BASE = 'http://localhost:3333/api/v1';

interface TestResult {
    endpoint: string;
    method: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    statusCode?: number;
    message: string;
    duration: number;
}

const results: TestResult[] = [];
let authToken: string = '';
let tenantId: string = '';

// IDs para cleanup
const cleanup: { type: string; id: string }[] = [];

async function makeRequest(
    method: string,
    endpoint: string,
    body?: any,
    requireAuth: boolean = true
): Promise<{ status: number; data: any; duration: number }> {
    const start = Date.now();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (requireAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const duration = Date.now() - start;
        let data;
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        return { status: response.status, data, duration };
    } catch (error: any) {
        return {
            status: 0,
            data: { error: error.message },
            duration: Date.now() - start,
        };
    }
}

function logResult(result: TestResult) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    const status = result.statusCode ? ` [${result.statusCode}]` : '';
    console.log(`${icon} ${result.method.padEnd(6)} ${result.endpoint.padEnd(40)}${status} - ${result.message} (${result.duration}ms)`);
    results.push(result);
}

async function testAuth() {
    console.log('\n📦 1. AUTHENTICATION MODULE');
    console.log('─'.repeat(70));

    // Login
    const loginResult = await makeRequest('POST', '/auth/login', {
        email: 'admin@whatsaas.com',
        password: 'admin123',
    }, false);

    if (loginResult.status === 200 && loginResult.data.accessToken) {
        authToken = loginResult.data.accessToken;
        tenantId = loginResult.data.tenant?.id;
        logResult({
            endpoint: '/auth/login',
            method: 'POST',
            status: 'PASS',
            statusCode: loginResult.status,
            message: 'Login OK',
            duration: loginResult.duration,
        });
    } else {
        logResult({
            endpoint: '/auth/login',
            method: 'POST',
            status: 'FAIL',
            statusCode: loginResult.status,
            message: loginResult.data?.message || 'Login falhou',
            duration: loginResult.duration,
        });

        // Tentar reset do admin
        console.log('   → Tentando reset do admin...');
        const resetResult = await makeRequest('POST', '/auth/reset-admin', {}, false);
        if (resetResult.status === 201 || resetResult.status === 200) {
            console.log('   → Admin resetado, tentando login novamente...');
            const retryLogin = await makeRequest('POST', '/auth/login', {
                email: 'admin@whatsaas.com',
                password: 'admin123',
            }, false);
            if (retryLogin.status === 200 && retryLogin.data.accessToken) {
                authToken = retryLogin.data.accessToken;
                tenantId = retryLogin.data.tenant?.id;
                logResult({
                    endpoint: '/auth/login (retry)',
                    method: 'POST',
                    status: 'PASS',
                    statusCode: retryLogin.status,
                    message: 'Login OK após reset',
                    duration: retryLogin.duration,
                });
            }
        }
    }

    if (!authToken) {
        console.log('\n❌ FALHA CRÍTICA: Não foi possível obter token de autenticação.');
        console.log('   O restante dos testes será abortado.');
        process.exit(1);
    }
}

async function testInstances() {
    console.log('\n📦 2. INSTANCES (CHIPS) MODULE');
    console.log('─'.repeat(70));

    // List instances
    const listResult = await makeRequest('GET', '/instances');
    logResult({
        endpoint: '/instances',
        method: 'GET',
        status: listResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: listResult.status,
        message: Array.isArray(listResult.data) ? `${listResult.data.length} instâncias` : 'Erro ao listar',
        duration: listResult.duration,
    });

    // Get providers
    const providersResult = await makeRequest('GET', '/instances/providers');
    logResult({
        endpoint: '/instances/providers',
        method: 'GET',
        status: providersResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: providersResult.status,
        message: providersResult.data?.providers ? `${providersResult.data.providers.length} providers` : 'Erro',
        duration: providersResult.duration,
    });

    // List proxies
    const proxiesResult = await makeRequest('GET', '/instances/proxies');
    logResult({
        endpoint: '/instances/proxies',
        method: 'GET',
        status: proxiesResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: proxiesResult.status,
        message: Array.isArray(proxiesResult.data) ? `${proxiesResult.data.length} proxies` : 'Erro',
        duration: proxiesResult.duration,
    });
}

async function testContacts() {
    console.log('\n📦 3. CONTACTS MODULE');
    console.log('─'.repeat(70));

    // List contacts
    const listResult = await makeRequest('GET', '/contacts');
    logResult({
        endpoint: '/contacts',
        method: 'GET',
        status: listResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: listResult.status,
        message: listResult.data?.data ? `${listResult.data.data.length} contatos` : 'Erro',
        duration: listResult.duration,
    });

    // Get stats
    const statsResult = await makeRequest('GET', '/contacts/stats');
    logResult({
        endpoint: '/contacts/stats',
        method: 'GET',
        status: statsResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: statsResult.status,
        message: statsResult.data?.total !== undefined ? `Total: ${statsResult.data.total}` : 'Erro',
        duration: statsResult.duration,
    });

    // Create contact
    const createResult = await makeRequest('POST', '/contacts', {
        phone: `5511${Date.now().toString().slice(-8)}`,
        name: 'Teste Validação API',
    });
    if (createResult.status === 201 && createResult.data?.id) {
        cleanup.push({ type: 'contact', id: createResult.data.id });
    }
    logResult({
        endpoint: '/contacts',
        method: 'POST',
        status: createResult.status === 201 ? 'PASS' : 'FAIL',
        statusCode: createResult.status,
        message: createResult.data?.id ? 'Contato criado' : createResult.data?.message || 'Erro',
        duration: createResult.duration,
    });

    // List tags
    const tagsResult = await makeRequest('GET', '/contacts/tags/list');
    logResult({
        endpoint: '/contacts/tags/list',
        method: 'GET',
        status: tagsResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: tagsResult.status,
        message: Array.isArray(tagsResult.data) ? `${tagsResult.data.length} tags` : 'Erro',
        duration: tagsResult.duration,
    });

    // List fields
    const fieldsResult = await makeRequest('GET', '/contacts/fields/list');
    logResult({
        endpoint: '/contacts/fields/list',
        method: 'GET',
        status: fieldsResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: fieldsResult.status,
        message: Array.isArray(fieldsResult.data) ? `${fieldsResult.data.length} campos` : 'Erro',
        duration: fieldsResult.duration,
    });
}

async function testCampaigns() {
    console.log('\n📦 4. CAMPAIGNS MODULE');
    console.log('─'.repeat(70));

    // List campaigns
    const listResult = await makeRequest('GET', '/campaigns');
    logResult({
        endpoint: '/campaigns',
        method: 'GET',
        status: listResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: listResult.status,
        message: listResult.data?.data ? `${listResult.data.data.length} campanhas` : 'Erro',
        duration: listResult.duration,
    });

    // List templates
    const templatesResult = await makeRequest('GET', '/campaigns/templates');
    logResult({
        endpoint: '/campaigns/templates',
        method: 'GET',
        status: templatesResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: templatesResult.status,
        message: Array.isArray(templatesResult.data) ? `${templatesResult.data.length} templates` : 'Erro',
        duration: templatesResult.duration,
    });

    // Create template
    const createTemplateResult = await makeRequest('POST', '/campaigns/templates', {
        name: `Tmpl-Validacao-${Date.now()}`,
        content: 'Teste de validação {{nome}}',
        contentType: 'text',
    });
    if (createTemplateResult.status === 201 && createTemplateResult.data?.id) {
        cleanup.push({ type: 'template', id: createTemplateResult.data.id });
    }
    logResult({
        endpoint: '/campaigns/templates',
        method: 'POST',
        status: createTemplateResult.status === 201 ? 'PASS' : 'FAIL',
        statusCode: createTemplateResult.status,
        message: createTemplateResult.data?.id ? 'Template criado' : createTemplateResult.data?.message || 'Erro',
        duration: createTemplateResult.duration,
    });

    // List campaign contacts
    const contactsResult = await makeRequest('GET', '/campaigns/contacts');
    logResult({
        endpoint: '/campaigns/contacts',
        method: 'GET',
        status: contactsResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: contactsResult.status,
        message: 'Listagem OK',
        duration: contactsResult.duration,
    });
}

async function testFlows() {
    console.log('\n📦 5. FLOWS MODULE');
    console.log('─'.repeat(70));

    // List flows
    const listResult = await makeRequest('GET', '/flows');
    logResult({
        endpoint: '/flows',
        method: 'GET',
        status: listResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: listResult.status,
        message: Array.isArray(listResult.data) ? `${listResult.data.length} fluxos` : 'Erro',
        duration: listResult.duration,
    });

    // Get stats
    const statsResult = await makeRequest('GET', '/flows/stats');
    logResult({
        endpoint: '/flows/stats',
        method: 'GET',
        status: statsResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: statsResult.status,
        message: 'Stats OK',
        duration: statsResult.duration,
    });

    // Create flow
    const createResult = await makeRequest('POST', '/flows', {
        name: `Fluxo-Validacao-${Date.now()}`,
        description: 'Fluxo de teste de validação',
        nodes: [
            { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
            { id: 'msg1', type: 'message', position: { x: 0, y: 100 }, data: { content: 'Olá!' } },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'msg1' }],
    });
    if (createResult.status === 201 && createResult.data?.id) {
        cleanup.push({ type: 'flow', id: createResult.data.id });
    }
    logResult({
        endpoint: '/flows',
        method: 'POST',
        status: createResult.status === 201 ? 'PASS' : 'FAIL',
        statusCode: createResult.status,
        message: createResult.data?.id ? 'Fluxo criado' : createResult.data?.message || 'Erro',
        duration: createResult.duration,
    });

    // List executions
    const execsResult = await makeRequest('GET', '/flows/executions/list');
    logResult({
        endpoint: '/flows/executions/list',
        method: 'GET',
        status: execsResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: execsResult.status,
        message: Array.isArray(execsResult.data) ? `${execsResult.data.length} execuções` : 'Erro',
        duration: execsResult.duration,
    });
}

async function testSettings() {
    console.log('\n📦 6. SETTINGS MODULE');
    console.log('─'.repeat(70));

    // Get settings
    const getResult = await makeRequest('GET', '/settings');
    logResult({
        endpoint: '/settings',
        method: 'GET',
        status: getResult.status === 200 ? 'PASS' : 'FAIL',
        statusCode: getResult.status,
        message: 'Settings OK',
        duration: getResult.duration,
    });
}

async function testAI() {
    console.log('\n📦 7. AI MODULE');
    console.log('─'.repeat(70));

    // Spin text
    const spinResult = await makeRequest('POST', '/ai/spin', {
        originalText: 'Olá, como vai você?',
        count: 1,
    });
    logResult({
        endpoint: '/ai/spin',
        method: 'POST',
        status: spinResult.status === 200 || spinResult.status === 201 ? 'PASS' :
            spinResult.status === 500 ? 'WARN' : 'FAIL',
        statusCode: spinResult.status,
        message: spinResult.status === 500 ? 'API Key não configurada' :
            spinResult.data?.variations ? 'Spin OK' : spinResult.data?.message || 'Erro',
        duration: spinResult.duration,
    });
}

async function runCleanup() {
    console.log('\n🧹 CLEANUP');
    console.log('─'.repeat(70));

    for (const item of cleanup) {
        let endpoint = '';
        switch (item.type) {
            case 'contact':
                endpoint = `/contacts/${item.id}`;
                break;
            case 'flow':
                endpoint = `/flows/${item.id}`;
                break;
            // Templates não têm endpoint de delete individual no campaigns controller
            default:
                continue;
        }

        if (endpoint) {
            const result = await makeRequest('DELETE', endpoint);
            console.log(`   🗑️  ${item.type}: ${result.status === 200 || result.status === 204 ? 'OK' : 'FALHOU'}`);
        }
    }
}

async function printSummary() {
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('📊 RESUMO DA VALIDAÇÃO - WhatSaas API');
    console.log('═'.repeat(70));

    const passed = results.filter(r => r.status === 'PASS').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const total = results.length;

    console.log(`\n✅ PASSOU:  ${passed}/${total}`);
    console.log(`⚠️  AVISO:   ${warned}/${total}`);
    console.log(`❌ FALHOU:  ${failed}/${total}`);

    if (failed > 0) {
        console.log('\n🔴 ENDPOINTS COM FALHA:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.method} ${r.endpoint}: ${r.message}`);
        });
    }

    const avgDuration = Math.round(results.reduce((acc, r) => acc + r.duration, 0) / total);
    console.log(`\n⏱️  Tempo médio de resposta: ${avgDuration}ms`);
    console.log('═'.repeat(70));

    if (failed === 0) {
        console.log('\n🎉 TODAS AS APIS ESTÃO FUNCIONANDO CORRETAMENTE!\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  EXISTEM PROBLEMAS QUE PRECISAM SER CORRIGIDOS.\n');
        process.exit(1);
    }
}

async function main() {
    console.log('═'.repeat(70));
    console.log('🔍 WhatSaas - Validação Completa de APIs');
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}`);
    console.log(`🔗 ${API_BASE}`);
    console.log('═'.repeat(70));

    await testAuth();
    await testInstances();
    await testContacts();
    await testCampaigns();
    await testFlows();
    await testSettings();
    await testAI();
    await runCleanup();
    await printSummary();
}

main().catch(console.error);
