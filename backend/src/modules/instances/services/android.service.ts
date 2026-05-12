import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as adb from '@devicefarmer/adbkit';
import { Promise } from 'bluebird';
import * as path from 'path';
import * as fs from 'fs';

// Package names for each WhatsApp variant
const WA_PACKAGES = {
  regular: 'com.whatsapp',
  business: 'com.whatsapp.w4b',
} as const;

type WaType = keyof typeof WA_PACKAGES;

@Injectable()
export class AndroidService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AndroidService.name);
  private client: adb.Client;
  private tracker: any;
  private adbAvailable = false;

  constructor() {
    try {
      // Tenta usar o caminho local embutido primeiro
      const localAdbPath = path.join(process.cwd(), 'bin', 'platform-tools', 'adb.exe');
      
      if (fs.existsSync(localAdbPath)) {
        this.logger.log(` utilizando ADB local: ${localAdbPath}`);
        this.client = adb.Adb.createClient({ bin: localAdbPath });
      } else {
        this.logger.warn('ADB local não encontrado, tentando usar ADB do sistema...');
        this.client = adb.Adb.createClient();
      }
    } catch (err) {
      this.logger.error('Erro ao inicializar cliente ADB:', err);
    }
  }

  async onModuleInit() {
    try {
      // Check if adb is actually in path by running a simple command
      await this.client.listDevices();
      this.adbAvailable = true;
      this.logger.log('🚀 Iniciando rastreamento de dispositivos Android via USB...');
      this.tracker = await this.client.trackDevices();
      
      this.tracker.on('add', (device) => {
        this.logger.log(`📱 Celular conectado: ${device.id}`);
      });

      this.tracker.on('remove', (device) => {
        this.logger.warn(`❌ Celular desconectado: ${device.id}`);
      });
    } catch (err) {
      this.logger.error('Falha ao iniciar rastreador ADB. Verifique se o ADB está no PATH.');
    }
  }

  onModuleDestroy() {
    if (this.tracker) this.tracker.end();
  }

  async listDevices() {
    return this.client.listDevices();
  }

  async tap(deviceId: string, x: number, y: number) {
    return (await this.client.getDevice(deviceId)).shell(`input tap ${x} ${y}`);
  }

  private async readStream(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      stream.on('data', (chunk) => data += chunk);
      stream.on('end', () => resolve(data));
      stream.on('error', reject);
    });
  }

  async typeText(deviceId: string, text: string) {
    const escapedText = text.replace(/ /g, '%s');
    return (await this.client.getDevice(deviceId)).shell(`input text "${escapedText}"`);
  }

  async openWhatsApp(deviceId: string, waType: WaType = 'regular') {
    const pkg = WA_PACKAGES[waType];
    return (await this.client.getDevice(deviceId)).shell(
      `monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`
    );
  }

  /** Returns which WhatsApp variants are installed on the device */
  async getInstalledWhatsApps(deviceId: string): Promise<{ regular: boolean; business: boolean }> {
    try {
      const device = await this.client.getDevice(deviceId);
      const stream = await device.shell(
        `pm list packages ${WA_PACKAGES.regular} ${WA_PACKAGES.business}`
      );
      const output = await this.readStream(stream);
      return {
        regular: output.includes(WA_PACKAGES.regular),
        business: output.includes(WA_PACKAGES.business),
      };
    } catch {
      return { regular: false, business: false };
    }
  }

  async sendWhatsAppMessage(
    deviceId: string,
    phoneNumber: string,
    message: string,
    waType: WaType = 'regular',
  ) {
    const device = await this.client.getDevice(deviceId);
    const pkg = WA_PACKAGES[waType];

    // 1. Abrir o chat diretamente via Intent com o package específico
    // Nota: phoneNumber deve estar com DDI (ex: 55119...)
    const intent = `am start -a android.intent.action.VIEW -p ${pkg} -d "https://api.whatsapp.com/send?phone=${phoneNumber}"`;
    await device.shell(intent);

    // 2. Esperar o app carregar (aprox 3-4 segundos dependendo do celular)
    await Promise.delay(4000);

    // 3. Digitar a mensagem
    const escapedMessage = message.replace(/ /g, '%s').replace(/"/g, '\\"');
    await device.shell(`input text "${escapedMessage}"`);

    // 4. Pequena pausa para garantir que o texto foi inserido
    await Promise.delay(500);

    // 5. Pressionar Enter (Keycode 66) para enviar
    await device.shell('input keyevent 66');

    this.logger.log(`[MobileFarm] Mensagem enviada para ${phoneNumber} via ${waType === 'business' ? 'WhatsApp Business' : 'WhatsApp'} (${deviceId})`);
    return { success: true };
  }

  async getBatteryLevel(deviceId: string): Promise<number> {
    try {
      const output = await (await this.client.getDevice(deviceId)).shell('dumpsys battery | grep level');
      const content = await this.readStream(output);
      const match = content.match(/level: (\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (err) {
      return 0;
    }
  }

  async getDeviceModel(deviceId: string): Promise<string> {
    try {
      const output = await (await this.client.getDevice(deviceId)).shell('getprop ro.product.model');
      const content = await this.readStream(output);
      return content.trim() || 'Unknown Android';
    } catch (err) {
      return 'Unknown Device';
    }
  }

  async getDeviceInfo(deviceId: string) {
    const [model, battery, installedWa] = await Promise.all([
      this.getDeviceModel(deviceId),
      this.getBatteryLevel(deviceId),
      this.getInstalledWhatsApps(deviceId),
    ]);
    return {
      id: deviceId,
      model,
      battery,
      status: 'online',
      installedWa,  // { regular: boolean, business: boolean }
    };
  }

  async listFullDevices() {
    if (!this.adbAvailable) {
      throw new Error('ADB não encontrado no sistema. Por favor, instale o Android Platform Tools.');
    }
    const devices = await this.listDevices();
    return Promise.map(devices, (device) => this.getDeviceInfo(device.id));
  }

  async takeScreenshot(deviceId: string): Promise<Buffer> {
    try {
      const output = await (await this.client.getDevice(deviceId)).screencap();
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        output.on('data', (chunk) => chunks.push(chunk));
        output.on('end', () => resolve(Buffer.concat(chunks)));
        output.on('error', reject);
      });
    } catch (err) {
      this.logger.error(`Erro ao tirar screenshot do dispositivo ${deviceId}:`, err);
      throw err;
    }
  }

  isAdbAvailable() {
    return this.adbAvailable;
  }
}
