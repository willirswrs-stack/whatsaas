import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as adb from '@devicefarmer/adbkit';
import { Promise } from 'bluebird';

@Injectable()
export class AndroidService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AndroidService.name);
  private client: adb.Client;
  private tracker: any;

  constructor() {
    this.client = adb.createClient();
  }

  async onModuleInit() {
    try {
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
    return this.client.shell(deviceId, `input tap ${x} ${y}`);
  }

  async typeText(deviceId: string, text: string) {
    const escapedText = text.replace(/ /g, '%s');
    return this.client.shell(deviceId, `input text "${escapedText}"`);
  }

  async openWhatsApp(deviceId: string) {
    return this.client.shell(deviceId, 'monkey -p com.whatsapp -c android.intent.category.LAUNCHER 1');
  }

  async getBatteryLevel(deviceId: string): Promise<number> {
    const output = await this.client.shell(deviceId, 'dumpsys battery | grep level');
    // Implementar parse do output para retornar número
    return 100; 
  }
}
