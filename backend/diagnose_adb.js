const adb = require('@devicefarmer/adbkit');
const path = require('path');
const fs = require('fs');
const localAdbPath = path.join(__dirname, 'bin', 'platform-tools', 'adb.exe');
const client = fs.existsSync(localAdbPath) 
    ? adb.Adb.createClient({ bin: localAdbPath })
    : adb.Adb.createClient();

async function testAdb() {
    console.log('🔍 Buscando dispositivos Android conectados...');
    try {
        const devices = await client.listDevices();
        console.log(`📱 Total de dispositivos encontrados: ${devices.length}`);
        
        for (const device of devices) {
            const properties = await client.getProperties(device.id);
            const model = properties['ro.product.model'] || 'Modelo Desconhecido';
            const version = properties['ro.build.version.release'] || 'N/A';
            console.log(`   - [ID: ${device.id}] ${model} (Android ${version}) - Status: ${device.type}`);
        }

        if (devices.length === 0) {
            console.log('⚠️ Nenhum dispositivo encontrado. Verifique os cabos e a Depuração USB.');
        } else if (devices.length < 4) {
            console.log(`⚠️ Encontramos apenas ${devices.length} de 4 celulares. Verifique as conexões.`);
        } else {
            console.log('✅ Todos os 4 celulares foram detectados com sucesso!');
        }
    } catch (err) {
        console.error('❌ Erro ao acessar o ADB:', err.message);
        if (err.message.includes('ECONNREFUSED')) {
            console.log('👉 Dica: Certifique-se de que o servidor ADB está rodando (tente digitar "adb devices" no seu terminal).');
        }
    }
}

testAdb();
