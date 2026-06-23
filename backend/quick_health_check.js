const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const EVO_URL = 'https://evolution.whatsaas.online';
const EVO_KEY = 'whatsaas_evolution_key_2024';
const PG = 'docker exec -i whatsaas-postgres psql -U postgres -d wathsaas';

function q(sql) { return `${PG} -c "${sql}" 2>&1`; }

async function healthCheck() {
    console.log('=== HEALTH CHECK RÁPIDO ===');
    console.log(new Date().toLocaleString('pt-BR'), '\n');

    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000 });

    // 1. Containers
    console.log('🐳 CONTAINERS:');
    const c = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}"');
    console.log(c.stdout);

    // 2. Instâncias no banco
    console.log('📱 INSTÂNCIAS NO BANCO:');
    const i = await ssh.execCommand(q('SELECT instance_name, phone, status, warmup_day, daily_sent, daily_limit FROM instances ORDER BY created_at DESC;'));
    console.log(i.stdout || i.stderr);

    // 3. Campanhas pendentes
    console.log('📣 CAMPANHAS ATIVAS/PENDENTES:');
    const camp = await ssh.execCommand(q("SELECT name, status, total_contacts, sent_count FROM campaigns WHERE status NOT IN ('completed','cancelled','failed') ORDER BY created_at DESC;"));
    console.log(camp.stdout || camp.stderr);

    // 4. Instâncias na Evolution API
    console.log('⚡ INSTÂNCIAS NA EVOLUTION API:');
    const evo = await ssh.execCommand(`curl -s -H "apikey: ${EVO_KEY}" ${EVO_URL}/instance/fetchInstances 2>&1`);
    try {
        const data = JSON.parse(evo.stdout);
        const list = Array.isArray(data) ? data : (data.data || data.instances || []);
        if (list.length === 0) {
            console.log('  (nenhuma instância cadastrada na Evolution)');
        } else {
            list.forEach(inst => {
                const name = inst.name || inst.instanceName || '?';
                const st = inst.connectionStatus || inst.state || '?';
                console.log(`  - ${name} => ${st}`);
            });
        }
    } catch(e) {
        console.log(evo.stdout || evo.stderr);
    }

    // 5. Jobs BullMQ com erro
    console.log('\n🔴 JOBS COM ERRO NO REDIS (queues de campanha):');
    const rkeys = await ssh.execCommand('docker exec -i whatsaas-redis redis-cli -a wathsaas_redis_2024 --no-auth-warning LLEN "bull:campaign-dispatch:failed" 2>&1');
    console.log('  Failed jobs:', rkeys.stdout?.trim() || '0');

    // 6. Erros recentes no backend (últimos 5min)
    console.log('\n⚠️  ERROS NO BACKEND (últimos 5 min):');
    const err = await ssh.execCommand('docker logs whatsaas-backend --since 5m 2>&1 | grep -i "error\\|FATAL" | grep -v "presenceUpdate" | tail -10');
    console.log(err.stdout?.trim() || '  ✅ Nenhum erro crítico');

    ssh.dispose();
    console.log('\n=== CHECK CONCLUÍDO ===');
}

healthCheck().catch(e => { console.error(e.message); try { ssh.dispose(); } catch(_) {} });
