import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WhatsAppProviderFactory } from './src/modules/whatsapp/whatsapp-provider.factory';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const factory = app.get(WhatsAppProviderFactory);
    const provider = factory.getProvider('evolution');
    
    const instanceName = 'brw-willian-3345';
    const targetPhone = '556281952897'; 

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
    
    console.log(`🧪 INICIANDO TESTE - Envio de Áudio de brw-willian-3345 para 556281952897...`);
    
    try {
        console.log("🚀 TENTATIVA: Enviando Base64 PURO...");
        const res = await provider.sendMedia(instanceName, targetPhone, {
            type: 'audio',
            url: base64Audio,
            filename: 'teste.mp3'
        });
        console.log("✅ SUCESSO:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("❌ FALHA:", e.message);
    }
    
    await app.close();
}
run();
