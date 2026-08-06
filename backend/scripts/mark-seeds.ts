import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Instance } from '../src/modules/instances/entities/instance.entity';

async function markSeeds() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const dataSource = app.get(DataSource);
  const instanceRepo = dataSource.getRepository(Instance);

  const instances = await instanceRepo.find();

  console.log(`\n==================================================`);
  console.log(`🔍 DIAGNÓSTICO DE INSTÂNCIAS NO BANCO DE DADOS (${instances.length} encontradas)`);
  console.log(`==================================================`);

  instances.forEach((inst, index) => {
    console.log(`[${index + 1}] ID: ${inst.id} | Nome: ${inst.instanceName} | TenantId: ${inst.tenantId}`);
    console.log(`    Telefone: ${inst.phone || 'N/A'} | Status: ${inst.status}`);
    console.log(`    É Semente (isSystemSeed): ${inst.isSystemSeed ? '✅ SIM' : '❌ NÃO'} | Warmup: ${inst.warmupEnabled ? 'HABILITADO' : 'DESABILITADO'}`);
    console.log(`--------------------------------------------------`);
  });

  // Se passado como argumento na linha de comando: npx ts-node scripts/mark-seeds.ts <tenantId_ou_ids...>
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const target = args[0];
    console.log(`\n⏳ Atualizando instâncias correspondentes a '${target}' para isSystemSeed = true...`);
    
    const result = await dataSource.query(
      `UPDATE instances SET is_system_seed = true WHERE tenant_id = $1 OR id = ANY($2::uuid[]) OR phone = ANY($3::text[])`,
      [target, args, args]
    );

    console.log(`✅ Atualização concluída! Afetou ${result[1] || 0} linha(s).`);
  } else {
    console.log(`\n💡 Para marcar uma conta/tenant ou telefones específicos como semente, execute:`);
    console.log(`   npx ts-node scripts/mark-seeds.ts <TENANT_ID_OU_PHONE>`);
  }

  await app.close();
}

markSeeds().catch(err => {
  console.error('❌ Erro executando script de sementes:', err);
  process.exit(1);
});
