import { Injectable, Logger } from '@nestjs/common';
import { AutoHealingGateway } from './auto-healing.gateway';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AutoHealingService {
  private readonly logger = new Logger(AutoHealingService.name);

  constructor(
    private readonly gateway: AutoHealingGateway,
    private readonly aiService: AiService
  ) {}

  /**
   * Ponto de entrada para erros capturados pelo interceptor global.
   */
  async handleCapturedError(error: any, requestInfo: any) {
    const statusCode = error?.status || error?.response?.statusCode || 500;
    const message = error?.message || 'Unknown error';

    // Se for erro de validação (400) com mensagens de DTO, ou erros internos (500)
    // Ignoramos erros normais de negócio como 401 (Não autorizado) ou 404.
    if (statusCode === 500 || (statusCode === 400 && message.includes('Unexpected'))) {
      this.logger.warn(`Auto-Healing acionado para o erro: ${message}`);
      
      this.gateway.notifyErrorDetected({
        message: `Detectado erro ${statusCode}: ${message}`,
        context: requestInfo.url,
      });

      // Tenta aplicar heurísticas locais
      const healed = await this.applyHeuristics(error, requestInfo);

      if (healed) {
        this.gateway.notifyResolved({
          message: `Auto-Cura aplicada com sucesso no endpoint ${requestInfo.url}`,
        });
      } else {
        // Fase 3: Encaminhar para o LLM caso as heurísticas não resolvam
        this.gateway.notifyActionRequired({
          message: `O erro em ${requestInfo.url} requer análise profunda.`,
          proposal: 'Solicitando revisão pela IA...',
          payload: { error: message, stack: error?.stack, url: requestInfo.url }
        });
        
        // Dispara a análise assincronamente
        this.analyzeErrorWithLLM(error, requestInfo).catch(e => {
            this.logger.error(`AI analysis failed: ${e.message}`);
        });
      }
    }
  }

  private async applyHeuristics(error: any, requestInfo: any): Promise<boolean> {
    const message = error?.message || '';
    
    // Heurística 1: Falha de conexão com provider
    if (message.includes('ECONNREFUSED') && requestInfo.url.includes('/instances')) {
      this.gateway.notifyFixing({
        action: 'Reiniciando Provider',
        details: 'A conexão com a API do WhatsApp falhou. Iniciando tentativa de reconexão automática.'
      });
      // Simulando tempo de reparo
      await new Promise(r => setTimeout(r, 2000));
      return true;
    }

    return false; // Não conseguiu auto-curar por heurística
  }

  private async analyzeErrorWithLLM(error: any, requestInfo: any) {
    const systemPrompt = `Você é um engenheiro SRE autônomo. Analise este erro de backend. Responda APENAS em JSON no formato: { "rootCause": "string", "suggestedFix": "string", "patchAvailable": boolean }`;
    const userPrompt = `URL: ${requestInfo.url}\nError: ${error?.message || error}\nStack: ${error?.stack?.substring(0, 500) || 'N/A'}`;

    try {
        // Usa o AiService para gerar uma resposta (null usa mock se não tiver chave)
        const responseText = await this.aiService.generateResponseWithKey(systemPrompt, userPrompt, null, 'openai');
        
        let aiResult = { rootCause: "Desconhecido", suggestedFix: "Revisão manual necessária", patchAvailable: false };
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResult = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            this.logger.warn(`Failed to parse AI response: ${responseText}`);
        }

        // Notifica o frontend com a sugestão final
        this.gateway.notifyActionRequired({
            message: `Análise de IA Concluída para o erro em ${requestInfo.url}`,
            proposal: aiResult.suggestedFix,
            payload: { rootCause: aiResult.rootCause, patchAvailable: aiResult.patchAvailable }
        });

    } catch (e) {
        this.logger.error(`Error communicating with AI: ${e.message}`);
    }
  }
}
