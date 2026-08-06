import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WarmupService } from '../src/modules/anti-ban/warmup.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const warmupService = app.get(WarmupService);

  console.log('\n==================================================');
  console.log('🚀 EXECUTANDO FORÇADAMENTE ROTINA GLOBAL DE AQUECIMENTO...');
  console.log('==================================================');

  const result = await warmupService.createGlobalWarmupSessions();
  console.log('\n📊 RESULTADO DO DISPARO GLOBAL:', JSON.stringify(result, null, 2));

  await app.close();
}

run().catch(err => {
  console.error('❌ Erro executando rotina global:', err);
  process.exit(1);
});
