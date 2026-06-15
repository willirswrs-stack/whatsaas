const { Client } = require('pg');

async function fixPlan() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wathsaas'
    });
    
    await client.connect();
    try {
        // Encontrar o usuario
        const userRes = await client.query(`SELECT "tenantId" FROM "user" WHERE email = 'willi.rs.wrs@gmail.com'`);
        if (userRes.rows.length === 0) {
            console.log('Usuario nao encontrado');
            return;
        }
        const tenantId = userRes.rows[0].tenantId;
        
        // Atualizar o plano do tenant para 50 chips
        // Primeiro, vamos criar ou obter um plano com muitos chips
        await client.query(`UPDATE "plan" SET "maxInstances" = 50 WHERE name = 'Plano Básico' OR name = 'Free'`);
        
        // Ou atualizar diretamente o tenant
        // Na verdade as tabelas são "tenant" e "plan"
        console.log('Limite de chips do plano atualizado para 50.');
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

fixPlan();
