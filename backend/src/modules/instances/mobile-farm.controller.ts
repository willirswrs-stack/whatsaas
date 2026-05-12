import { Controller, Get, Post, Param, UseGuards, Res, HttpStatus, Body } from '@nestjs/common';
import * as express from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AndroidService } from './services/android.service';

@Controller('mobile-farm')
@UseGuards(AuthGuard('jwt'))
export class MobileFarmController {
  constructor(private readonly androidService: AndroidService) {}

  @Get('devices')
  async listDevices() {
    return this.androidService.listFullDevices();
  }

  @Get('status')
  async getStatus() {
    return {
      available: this.androidService.isAdbAvailable(),
      message: this.androidService.isAdbAvailable() 
        ? 'Motor ADB pronto e aguardando conexões USB.' 
        : 'Motor ADB não inicializado. Verifique a pasta bin/platform-tools.'
    };
  }

  @Post('devices/:id/open-whatsapp')
  async openWhatsApp(
    @Param('id') id: string,
    @Body() body: { waType?: 'regular' | 'business' }
  ) {
    await this.androidService.openWhatsApp(id, body?.waType ?? 'regular');
    return { success: true };
  }

  @Post('devices/:id/send-message')
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { phone: string; message: string; waType?: 'regular' | 'business' }
  ) {
    return this.androidService.sendWhatsAppMessage(
      id,
      body.phone,
      body.message,
      body.waType ?? 'regular',
    );
  }

  @Get('devices/:id/installed-wa')
  async getInstalledWa(@Param('id') id: string) {
    return this.androidService.getInstalledWhatsApps(id);
  }

  @Get('devices/:id/screenshot')
  async getScreenshot(@Param('id') id: string, @Res() res: express.Response) {
    try {
      const buffer = await this.androidService.takeScreenshot(id);
      res.set('Content-Type', 'image/png');
      res.status(HttpStatus.OK).send(buffer);
    } catch (err) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Erro ao capturar tela' });
    }
  }
}
