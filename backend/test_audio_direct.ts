import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WhatsAppProviderFactory } from './src/modules/whatsapp/whatsapp-provider.factory';
import * as fs from 'fs';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const factory = app.get(WhatsAppProviderFactory);
    const provider = factory.getProvider('evolution');
    
    const instanceName = 'willian-2897';
    const targetPhone = '553599963345'; // O outro chip do log
    
    console.log(`🧪 INICIANDO TESTE DE FOGO - Envio de Áudio real...`);
    
    try {
        // Create a tiny dummy mp3 buffer to simulate
        const buffer = Buffer.alloc(1024 * 10); // 10KB of zeros
        const dataUri = `data:audio/mpeg;base64,${buffer.toString('base64')}`;
        
        console.log("🚀 Tentando enviar via sendMedia(audio)...");
        const res = await provider.sendMedia(instanceName, targetPhone, {
            type: 'audio',
            url: dataUri,
            filename: 'teste.mp3'
        });
        
        console.log("✅ RESPOSTA DA API:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("❌ ERRO CAPTURADO:");
        console.error("Mensagem:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Headers:", e.response.headers);
            console.error("Body:", JSON.stringify(e.response.data, null, 2));
        } else {
            console.error("Objeto de Erro completo:", e);
        }
    }
    
    await app.close();
}
run();
