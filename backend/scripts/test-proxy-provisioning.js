/**
 * ============================================================
 * WhatSaas - Teste Prático de Provisionamento de Proxy (Webshare)
 * ============================================================
 * 
 * Este script valida o fluxo completo:
 * 1. Conectividade com a API Webshare (listagem do pool)
 * 2. Login na API WhatSaas e obtenção de token JWT
 * 3. Listagem de proxies existentes
 * 4. Listagem de instâncias existentes
 * 5. Teste de criação de instância com auto-alocação de proxy
 * 
 * Uso: node scripts/test-proxy-provisioning.js
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:3333/api/v1';
const WEBSHARE_API_KEY = process.env.WEBSHARE_API_KEY;

// Credenciais para login (usar admin@whatsaas.com ou seu user)
const TEST_EMAIL = 'admin@whatsaas.com';
const TEST_PASSWORD = 'admin123'; // Alterar se necessário

const DIVIDER = '═'.repeat(60);
const LINE = '─'.repeat(60);

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────
// ETAPA 1: Testar conectividade com a API da Webshare
// ─────────────────────────────────────────────────────────────
async function testWebshareAPI() {
    console.log(`\n${DIVIDER}`);
    console.log('  ETAPA 1: Teste de Conectividade Webshare API');
    console.log(DIVIDER);

    if (!WEBSHARE_API_KEY) {
        console.log('❌ WEBSHARE_API_KEY não encontrada no .env');
        return { success: false, count: 0 };
    }

    console.log(`🔑 API Key: ${WEBSHARE_API_KEY.substring(0, 8)}...${WEBSHARE_API_KEY.substring(WEBSHARE_API_KEY.length - 4)}`);

    try {
        const response = await axios.get('https://proxy.webshare.io/api/v2/proxy/list/', {
            params: { mode: 'direct', page_size: 100 },
            headers: { 'Authorization': `Token ${WEBSHARE_API_KEY}` },
            timeout: 10000
        });

        const proxies = response.data?.results || [];
        const totalCount = response.data?.count || proxies.length;

        console.log(`✅ Conexão Webshare OK!`);
        console.log(`📦 Total de proxies no pool: ${totalCount}`);
        console.log(`📄 Retornados nesta página: ${proxies.length}`);

        if (proxies.length > 0) {
            console.log(`\n📋 Amostra (primeiros 3 IPs):`);
            proxies.slice(0, 3).forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.proxy_address}:${p.port} (User: ${p.username}) [${p.country_code || 'N/A'}]`);
            });
        }

        return { success: true, count: totalCount, proxies };
    } catch (error) {
        console.log(`❌ Falha na Webshare: ${error.response?.data?.detail || error.message}`);
        if (error.response?.status === 401) {
            console.log('   → Token da API inválido. Verifique WEBSHARE_API_KEY no .env');
        }
        return { success: false, count: 0 };
    }
}

// ─────────────────────────────────────────────────────────────
// ETAPA 2: Login na API WhatSaas e obter JWT
// ─────────────────────────────────────────────────────────────
async function loginWhatSaas() {
    console.log(`\n${DIVIDER}`);
    console.log('  ETAPA 2: Login na API WhatSaas');
    console.log(DIVIDER);

    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        }, { timeout: 5000 });

        const token = response.data?.access_token || response.data?.accessToken || response.data?.token;
        
        if (!token) {
            console.log('⚠️  Login OK mas token não encontrado no response.');
            console.log('   Response keys:', Object.keys(response.data));
            return null;
        }

        console.log(`✅ Login realizado com sucesso!`);
        console.log(`👤 Email: ${TEST_EMAIL}`);
        console.log(`🔑 Token: ${token.substring(0, 30)}...`);
        
        return token;
    } catch (error) {
        console.log(`❌ Falha no login: ${error.response?.data?.message || error.message}`);
        if (error.code === 'ECONNREFUSED') {
            console.log('   → Backend NestJS não está rodando em localhost:3333');
            console.log('   → Execute: npm run start:dev');
        }
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// ETAPA 3: Listar Proxies existentes
// ─────────────────────────────────────────────────────────────
async function listProxies(token) {
    console.log(`\n${DIVIDER}`);
    console.log('  ETAPA 3: Proxies existentes no banco');
    console.log(DIVIDER);

    try {
        const response = await axios.get(`${API_BASE}/proxies`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 5000
        });

        const proxies = response.data || [];
        console.log(`📦 Proxies cadastrados: ${proxies.length}`);

        if (proxies.length > 0) {
            proxies.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.host}:${p.port} | Provider: ${p.provider || 'N/A'} | Status: ${p.status} | Chip: ${p.assignedInstanceId || 'LIVRE'}`);
            });
        } else {
            console.log('   (nenhum proxy cadastrado ainda - será criado automaticamente ao criar um chip)');
        }

        return proxies;
    } catch (error) {
        console.log(`❌ Falha ao listar proxies: ${error.response?.data?.message || error.message}`);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────
// ETAPA 4: Listar Instâncias existentes
// ─────────────────────────────────────────────────────────────
async function listInstances(token) {
    console.log(`\n${DIVIDER}`);
    console.log('  ETAPA 4: Instâncias (chips) existentes');
    console.log(DIVIDER);

    try {
        const response = await axios.get(`${API_BASE}/instances`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 5000
        });

        const instances = response.data || [];
        console.log(`📱 Instâncias cadastradas: ${instances.length}`);

        if (instances.length > 0) {
            instances.forEach((inst, i) => {
                console.log(`   ${i + 1}. "${inst.instanceName}" | Status: ${inst.status} | Provider: ${inst.provider} | ProxyID: ${inst.proxyId || 'NENHUM'}`);
            });
        }

        return instances;
    } catch (error) {
        console.log(`❌ Falha ao listar instâncias: ${error.response?.data?.message || error.message}`);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────
// ETAPA 5: Criar instância com auto-alocação de proxy
// ─────────────────────────────────────────────────────────────
async function createInstanceWithProxy(token) {
    console.log(`\n${DIVIDER}`);
    console.log('  ETAPA 5: Criar Instância + Auto-Proxy');
    console.log(DIVIDER);

    const instanceName = `teste-proxy-${Date.now().toString(36)}`;

    console.log(`🆕 Nome da instância: ${instanceName}`);
    console.log(`📡 Provider: evolution`);
    console.log(`🔄 Proxy: auto-alocação via Webshare...`);

    try {
        const response = await axios.post(`${API_BASE}/instances`, {
            instanceName: instanceName,
            provider: 'evolution'
        }, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 35000
        });

        const { instance, qrCode } = response.data;

        console.log(`\n✅ SUCESSO! Instância criada!`);
        console.log(`   ID: ${instance.id}`);
        console.log(`   Nome: ${instance.instanceName}`);
        console.log(`   Status: ${instance.status}`);
        console.log(`   ProxyID: ${instance.proxyId || 'N/A'}`);
        console.log(`   QR Code: ${qrCode ? '✅ Gerado' : '⏳ Pendente'}`);

        return { success: true, instance, qrCode };
    } catch (error) {
        const errMsg = error.response?.data?.message || error.message;
        console.log(`❌ Falha na criação: ${errMsg}`);
        
        if (error.response?.data) {
            console.log('   Response completo:', JSON.stringify(error.response.data, null, 2));
        }
        
        return { success: false };
    }
}

// ─────────────────────────────────────────────────────────────
// ETAPA 6: Verificar proxy após criação
// ─────────────────────────────────────────────────────────────
async function verifyProxyAfterCreation(token) {
    console.log(`\n${DIVIDER}`);
    console.log('  ETAPA 6: Verificação pós-criação');
    console.log(DIVIDER);

    const proxies = await listProxies(token);

    if (proxies.length > 0) {
        const assigned = proxies.filter(p => p.assignedInstanceId);
        const free = proxies.filter(p => !p.assignedInstanceId);
        console.log(`\n📊 Resumo:`);
        console.log(`   Total: ${proxies.length} | Alocados: ${assigned.length} | Livres: ${free.length}`);
    }
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
    console.log('\n' + '🚀'.repeat(10));
    console.log('  WhatSaas - Teste de Provisionamento de Proxy');
    console.log('  ' + new Date().toLocaleString('pt-BR'));
    console.log('🚀'.repeat(10) + '\n');

    // Etapa 1: Webshare
    const webshare = await testWebshareAPI();

    // Etapa 2: Login
    const token = await loginWhatSaas();
    if (!token) {
        console.log('\n⛔ Teste abortado: Não foi possível fazer login no backend.');
        console.log('   Verifique se o backend está rodando (npm run start:dev) e as credenciais estão corretas.');
        process.exit(1);
    }

    // Etapa 3: Listar proxies
    await listProxies(token);

    // Etapa 4: Listar instâncias
    await listInstances(token);

    // Etapa 5: Criar instância com proxy
    console.log(`\n${LINE}`);
    console.log('   ⚡ Deseja criar uma instância de teste com proxy auto-alocado?');
    console.log('   Executando criação automaticamente em 3 segundos...');
    console.log(LINE);
    await sleep(3000);

    const result = await createInstanceWithProxy(token);

    // Etapa 6: Verificação
    if (result.success) {
        await sleep(1000);
        await verifyProxyAfterCreation(token);
    }

    console.log(`\n${DIVIDER}`);
    console.log('  ✅ TESTE CONCLUÍDO');
    console.log(DIVIDER + '\n');
}

main().catch(err => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
});
