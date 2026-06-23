const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const PG = 'docker exec -i whatsaas-postgres psql -U postgres -d wathsaas';
const INST_ID = '26f4c146-7f3c-429a-97c2-bfc96db452cf';

function q(sql) {
    return `${PG} -c "${sql}" 2>&1`;
}

async function limpezaFinal() {
    try {
        await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000 });
        
        // Verificar schema de warmup_schedules
        const s1 = await ssh.execCommand(q(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'warmup_schedules' ORDER BY ordinal_position;`
        ));
        console.log('Schema warmup_schedules:', s1.stdout);

        // Verificar schema de message_outbox
        const s2 = await ssh.execCommand(q(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'message_outbox' ORDER BY ordinal_position;`
        ));
        console.log('Schema message_outbox:', s2.stdout);

        // Ver conteúdo warmup_schedules para 3169
        const w1 = await ssh.execCommand(q(
            `SELECT * FROM warmup_schedules WHERE instance_id = '${INST_ID}';`
        ));
        console.log('Warmup schedules 3169:', w1.stdout || w1.stderr);

        // Deletar warmup_schedules pelo INST_ID
        const w2 = await ssh.execCommand(q(
            `DELETE FROM warmup_schedules WHERE instance_id = '${INST_ID}';`
        ));
        console.log('Delete warmup_schedules:', w2.stdout || w2.stderr);

        // Parar jobs do BullMQ via Redis (remover jobs com instanceName=3169)
        console.log('\nLimpando jobs do BullMQ no Redis...');
        const r1 = await ssh.execCommand(
            `docker exec -i whatsaas-redis redis-cli -a wathsaas_redis_2024 --no-auth-warning KEYS "*3169*" 2>&1`
        );
        console.log('Keys Redis com 3169:', r1.stdout || '(nenhuma)');

        if (r1.stdout && r1.stdout.trim() && r1.stdout.trim() !== '(empty array)') {
            const keys = r1.stdout.trim().split('\n');
            for (const key of keys) {
                if (key.trim()) {
                    const del = await ssh.execCommand(
                        `docker exec -i whatsaas-redis redis-cli -a wathsaas_redis_2024 --no-auth-warning DEL "${key.trim()}" 2>&1`
                    );
                    console.log(`  DEL ${key.trim()}: ${del.stdout}`);
                }
            }
        }

        ssh.dispose();
        console.log('\n✅ Limpeza final concluída!');
    } catch(e) {
        console.error(e.message);
        try { ssh.dispose(); } catch(_) {}
    }
}

limpezaFinal();
