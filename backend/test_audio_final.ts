import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WhatsAppProviderFactory } from './src/modules/whatsapp/whatsapp-provider.factory';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const factory = app.get(WhatsAppProviderFactory);
    const provider = factory.getProvider('evolution');
    
    const instanceName = 'willian-2897';
    const targetPhone = '553599963345'; 

    // Encontrar o primeiro arquivo MP3 real no diretório uploads
    const uploadsDir = path.join(__dirname, 'uploads', 'temp_warmup');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.mp3'));
    
    if (files.length === 0) {
        console.error("❌ NENHUM ARQUIVO DE ÁUDIO REAL ENCONTRADO NA PASTA!");
        await app.close();
        return;
    }
    
    const realFile = path.join(uploadsDir, files[0]);
    console.log(`📂 Usando arquivo real: ${realFile}`);
    const realBuffer = fs.readFileSync(realFile);
    
    const base64Audio = realBuffer.toString('base64');
    // Vamos testar SEM o prefixo data:audio no test 1, e com no test 2 se falhar!
    // A API Evolution V2 frequentemente espera APENAS a string base64 pura!
    
    console.log(`🧪 INICIANDO TESTE REAL - Envio de Áudio Autêntico...`);
    
    try {
        console.log("🚀 TENTATIVA 1: Enviando Base64 PURO (sem prefixo)...");
        const res1 = await provider.sendMedia(instanceName, targetPhone, {
            type: 'audio',
            url: base64Audio, // Pura
            filename: 'teste.mp3'
        });
        console.log("✅ SUCESSO TENTATIVA 1 (PURO):", JSON.stringify(res1, null, 2));
    } catch (e) {
        console.error("❌ FALHA TENTATIVA 1:", e.message);
        
        try {
            console.log("\n🚀 TENTATIVA 2: Enviando com Prefixo DataURI...");
            const dataUri = `data:audio/mp3;base64,${base64Audio}`;
            const res2 = await provider.sendMedia(instanceName, targetPhone, {
                type: 'audio',
                url: dataUri,
                filename: 'teste.mp3'
            });
            console.log("✅ SUCESSO TENTATIVA 2 (PREFIXO):", JSON.stringify(res2, null, 2));
        } catch (e2) {
            console.error("❌ FALHA TENTATIVA 2:", e2.message);
        }
    }
    
    await app.close();
}
run();
