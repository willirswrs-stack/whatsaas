import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ActivePreventionService {
  private readonly logger = new Logger(ActivePreventionService.name);

  /**
   * Gera telemetria de bateria realista baseada na hora do dia
   */
  generateBatteryTelemetry() {
    const hour = new Date().getHours();
    let level = 100;

    if (hour >= 8 && hour <= 12) level = 95 - (hour - 8) * 5; // Descarregando
    else if (hour > 12 && hour <= 18) level = 75 - (hour - 12) * 8; // Uso intenso
    else if (hour > 18 && hour <= 23) level = 20 + (hour - 18) * 15; // Carregando
    else level = 100; // Noite (100% carregado)

    return {
      level,
      isCharging: hour > 18 || hour < 7,
      health: 'good'
    };
  }

  /**
   * Simula ruído de movimento (Acelerômetro)
   * Útil para evitar detecção de dispositivos estáticos (bots)
   */
  generateMovementNoise() {
    return {
      x: (Math.random() * 0.5 - 0.25).toFixed(4),
      y: (Math.random() * 0.5 - 0.25).toFixed(4),
      z: (9.8 + Math.random() * 0.2).toFixed(4), // Gravidade terrestre + ruído
    };
  }

  /**
   * Aplica a prevenção ativa antes de um envio
   */
  async applyPrevention(instanceId: string) {
    const battery = this.generateBatteryTelemetry();
    const movement = this.generateMovementNoise();

    this.logger.debug(`🛡️ [Prevenção Ativa] Aplicando telemetria para ${instanceId}: Bat ${battery.level}% | Mov ${movement.x}`);
    
    // Aqui injetamos esses dados nos metadados da conexão com a Evolution API ou WAHA
    return {
      battery,
      movement,
      timestamp: new Date().toISOString()
    };
  }
}
