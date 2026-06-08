const PORT = process.env.PORT || '3333';
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const LOGIN_EMAIL = 'admin@whatsaas.com';
const LOGIN_PASS = 'admin123';

async function request(path: string, options: any = {}) {
    try {
        const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
        const res = await fetch(url, options);
        let data: any = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            await res.text(); // Consume body
        }
        return { status: res.status, data };
    } catch (err: any) {
        throw new Error(`Request failed to ${path}: ${err.message}`);
    }
}

async function run() {
    console.log(`🔍 Validando WhatSaas Stack na porta ${PORT}...`);

    // 1. Health
    try {
        const health = await request('/health');
        if (health.status === 200) {
            console.log('✅ Health Check: OK');
        } else {
            console.error('❌ Health Check Falhou:', health.status, health.data);
            process.exit(1); // Abort se health falhar
        }
    } catch (e: any) {
        console.error('❌ Health Check Offline (Server down?):', e.message);
        process.exit(1);
    }

    // 2. Auth
    let token = '';
    try {
        const login = await request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASS })
        });

        if (login.status === 200 || login.status === 201) {
            token = login.data.accessToken || login.data.token;
            console.log('✅ Login Admin: OK');
        } else {
            console.error('❌ Login Admin Falhou:', login.status, login.data);
            process.exit(1);
        }
    } catch (e: any) {
        console.error('❌ Login Exception:', e.message);
        process.exit(1);
    }

    const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 3. Reconnection Status
    try {
        const recon = await request('/reconnection/status', { headers: authHeaders });
        if (recon.status === 200) console.log('✅ Reconnection Endpoint: OK');
        else console.warn(`⚠️ Reconnection Endpoint Erro (${recon.status}) - Provável necessidade de restart.`);
    } catch (e: any) { console.warn('⚠️ Reconnection Exception:', e.message); }

    // 4. Bull Board
    try {
        const res = await fetch(`http://localhost:${PORT}/api/v1/queues`);
        if (res.status === 200) console.log('✅ Bull Board: OK');
        else console.error('❌ Bull Board Error:', res.status);
    } catch (e: any) { console.error('❌ Bull Board Offline:', e.message); }

    // 5. Instances Check
    try {
        const inst = await request('/instances', { headers: authHeaders });
        if (inst.status === 200) {
            const list = inst.data as any[];
            console.log(`✅ Instancias: OK (${list.length} encontradas)`);
        }
        else {
            console.error('❌ Listar Instancias Falhou:', inst.status);
            if (inst.status === 401) console.error('   Token usado:', token.substring(0, 20) + '...');
        }
    } catch (e: any) { console.error('❌ Instances Exception:', e.message); }
}

run();
