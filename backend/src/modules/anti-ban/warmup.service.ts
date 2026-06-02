/**
 * WarmupService - Intelligent Warmup Engine
 * 
 * Manages the lifecycle of new chips, gradually increasing their load capacity
 * to avoid bans. Implements a progressive maturity curve.
 * 
 * @principle "Slow is smooth, smooth is fast"
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Instance } from '../instances/entities/instance.entity';
import { WARMUP_QUEUE } from '../../config/bull.config';
import { InstancesService } from '../instances/instances.service';
import { AiService } from '../ai/ai.service';
import { InstanceStatus } from '../../common/enums/instance-status.enum';
import { HumanBehaviorService } from './human-behavior.service';
import { EventsGateway } from '../events/events.gateway';
import { ElevenLabsService } from '../ai/elevenlabs.service';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { GroupWarmupService } from './group-warmup.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Define the Warmup Schedule
export const WARMUP_SCHEDULE = [
    { day: 1, limit: 50, interval: 120, maxPartners: 1 },  // Dia 1: Apenas 1 parceiro (círculo íntimo)
    { day: 2, limit: 100, interval: 90, maxPartners: 2 },  
    { day: 3, limit: 150, interval: 60, maxPartners: 2 },
    { day: 4, limit: 250, interval: 45, maxPartners: 3 },
    { day: 5, limit: 400, interval: 35, maxPartners: 4 },
    { day: 6, limit: 600, interval: 30, maxPartners: 5 },
    { day: 7, limit: 800, interval: 25, maxPartners: 6 },
    { day: 8, limit: 1000, interval: 20, maxPartners: 8 },
    { day: 9, limit: 1300, interval: 15, maxPartners: 10 },
    { day: 10, limit: 1600, interval: 12, maxPartners: 12 },
    { day: 11, limit: 2000, interval: 10, maxPartners: 15 },
    { day: 12, limit: 2500, interval: 8, maxPartners: 20 },
    { day: 13, limit: 2800, interval: 6, maxPartners: 25 },
    { day: 14, limit: 3000, interval: 5, maxPartners: 30 }, // Dia 14: Alta diversidade social
];

// Max limit for mature chips
export const MATURE_LIMIT = 5000;

@Injectable()
export class WarmupService {
    private readonly logger = new Logger(WarmupService.name);

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        @InjectQueue(WARMUP_QUEUE) private warmupQueue: Queue,
        @Inject(forwardRef(() => InstancesService))
        private instancesService: InstancesService,
        private aiService: AiService,
        private elevenLabs: ElevenLabsService,
        private humanBehavior: HumanBehaviorService,
        private eventsGateway: EventsGateway,
        private whatsappFactory: WhatsAppProviderFactory,
        private groupWarmupService: GroupWarmupService,
    ) { }

    // =========================================================================
    // SCHEDULING
    // =========================================================================

    /**
     * Initializes the background scheduler
     */
    async onModuleInit() {
        await this.scheduleDailyJob();
    }

    /**
     * Schedules the daily repeatable job
     */
    async scheduleDailyJob() {
        // Remove existing repeatable jobs to avoid duplicates on restart
        const repeatableJobs = await this.warmupQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            if (job.name === 'daily-warmup-routine') {
                await this.warmupQueue.removeRepeatableByKey(job.key);
            }
        }

        // Add daily job (runs at 04:00 AM)
        await this.warmupQueue.add(
            'daily-warmup-routine',
            {},
            {
                repeat: {
                    pattern: '0 4 * * *', // Every day at 4am
                },
                jobId: 'daily-warmup-routine-job'
            }
        );

        this.logger.log('⏰ Daily Warmup Routine scheduled for 04:00 AM');
    }

    // =========================================================================
    // CORE LOGIC
    // =========================================================================

    /**
     * Executes the daily warmup routine for all tenants
     * Should be called once per day (e.g., via Cron or BullMQ)
     */
    async executeDailyWarmupRoutine(): Promise<{ advanced: number; completed: number; sessions: number }> {
        this.logger.log('🔥 Executing Daily Warmup Routine...');

        // Find all instances with warmup enabled
        const instances = await this.instanceRepo.find({
            where: { warmupEnabled: true },
        });

        let advancedCount = 0;
        let completedCount = 0;
        const tenantIds = new Set<string>();

        for (const instance of instances) {
            const result = await this.advanceInstanceWarmup(instance);
            if (result === 'advanced') advancedCount++;
            if (result === 'completed') completedCount++;

            // Collect tenant IDs for session generation
            if (instance.status === 'connected') {
                tenantIds.add(instance.tenantId);
                
                // 🚀 GATILHO DE GRUPOS: Executar rotina de caça e entrada em grupos
                this.groupWarmupService.processGroupWarmupForInstance(instance)
                    .then(res => {
                        if (res.success) this.logger.log(`[WarmupRoutine] Grupos para ${instance.instanceName}: ${res.message}`);
                    })
                    .catch(e => this.logger.warn(`[WarmupRoutine] Falha no aquecimento de grupos de ${instance.instanceName}: ${e.message}`));
            }
        }

        // Trigger warmup sessions for eligible tenants — create ALL pair combinations
        let sessionsTriggered = 0;
        for (const tenantId of tenantIds) {
            try {
                const sessionResults = await this.createAllPairSessions(tenantId);
                sessionsTriggered += sessionResults.sessionsCreated;
                this.logger.log(`💬 ${sessionResults.sessionsCreated} Warmup Sessions triggered for tenant ${tenantId}`);
            } catch (err) {
                this.logger.error(`Failed to trigger sessions for tenant ${tenantId}: ${err.message}`);
            }
        }

        this.logger.log(`✅ Warmup Routine Finished: ${advancedCount} advanced, ${completedCount} completed, ${sessionsTriggered} sessions created.`);
        return { advanced: advancedCount, completed: completedCount, sessions: sessionsTriggered };
    }

    /**
     * Advances a single instance's warmup stage
     */
    async advanceInstanceWarmup(instance: Instance): Promise<'advanced' | 'completed' | 'no-change'> {
        // Validation: If disconnected or banned, do not advance
        if (instance.status !== 'connected') {
            this.logger.warn(`Skipping warmup advance for ${instance.instanceName} (Status: ${instance.status})`);
            return 'no-change';
        }

        // Initialize if null
        if (!instance.warmupDay) instance.warmupDay = 0;

        // Increment day
        const nextDay = instance.warmupDay + 1;
        const schedule = this.getScheduleForDay(nextDay);

        if (!schedule) {
            // Reached end of schedule -> Graduate
            this.logger.log(`🎓 Instance ${instance.instanceName} has graduated from warmup!`);

            await this.instanceRepo.update(instance.id, {
                warmupEnabled: false,
                warmupDay: nextDay,
                dailyLimit: MATURE_LIMIT,
                dailySent: 0,
            });

            return 'completed';
        }

        // Advance to next stage
        await this.instanceRepo.update(instance.id, {
            warmupDay: nextDay,
            dailyLimit: schedule.limit,
            dailySent: 0,
        });

        this.logger.log(
            `📈 Instance ${instance.instanceName} advanced to Day ${nextDay} ` +
            `(Limit: ${schedule.limit}, Interval: ${schedule.interval}s)`
        );

        return 'advanced';
    }

    /**
     * Creates a warmup session (conversation) between two instances
     */
    /**
     * Cria sessões de warmup para pares selecionados de instâncias.
     * Diferente do All Pairs, aqui limitamos a diversidade de contatos individualmente,
     * simulando um crescimento de rede social orgânico.
     */
    async createAllPairSessions(tenantId: string) {
        const instances = await this.instancesService.findAll(tenantId);
        const candidates = instances.filter(i =>
            (i.status === InstanceStatus.CONNECTED || i.status === 'connected' as any) &&
            i.warmupEnabled &&
            i.phone
        );

        if (candidates.length < 2) {
            this.logger.warn(`Not enough candidates for warmup (Found ${candidates.length}, need ≥2)`);
            return { sessionsCreated: 0, reason: 'min_instances' };
        }

        this.logger.log(`🔄 Gerando rede de conversação dinâmica para ${candidates.length} instâncias...`);

        const pairKeys = new Set<string>(); // Para evitar duplicatas A-B e B-A
        const selectedPairs: [any, any][] = [];

        for (const chip of candidates) {
            // 1. Determina o limite de parceiros deste chip hoje
            const schedule = this.getScheduleForDay(chip.warmupDay || 1);
            const maxPartners = (schedule as any)?.maxPartners || 1;
            
            // 2. Seleciona parceiros aleatórios para este chip
            const possiblePartners = candidates.filter(c => c.id !== chip.id);
            const shuffledPartners = possiblePartners.sort(() => 0.5 - Math.random());
            const chipsToTalkWith = shuffledPartners.slice(0, Math.min(maxPartners, possiblePartners.length));

            for (const partner of chipsToTalkWith) {
                const key = [chip.id, partner.id].sort().join(':');
                if (!pairKeys.has(key)) {
                    pairKeys.add(key);
                    selectedPairs.push([chip, partner]);
                }
            }
        }

        this.logger.log(`🔗 Gerados ${selectedPairs.length} pares únicos (Dentre ${candidates.length} candidatos)`);

        let sessionsCreated = 0;
        let baseDelay = 0;

        for (const [instA, instB] of selectedPairs) {
            try {
                const result = await this.createWarmupSession(tenantId, instA, instB, baseDelay);
                if (result.success) {
                    sessionsCreated++;
                    // Escalona as sessões para não começarem todas exatamente ao mesmo tempo
                    baseDelay += (Math.floor(Math.random() * 120000) + 60000); // 1-3 min gap
                }
            } catch (err) {
                this.logger.error(`Session error ${instA.instanceName}↔${instB.instanceName}: ${err.message}`);
            }
        }

        return { sessionsCreated, totalPairs: selectedPairs.length };
    }

    /**
     * Creates a single warmup session (conversation) between two specific instances
     */
    async createWarmupSession(tenantId: string, instA?: any, instB?: any, startDelayMs: number = 0) {
        let resolvedA = typeof instA === 'object' ? instA : null;
        let resolvedB = typeof instB === 'object' ? instB : null;

        // If specific IDs were requested, fetch them
        if (typeof instA === 'string' && typeof instB === 'string') {
            const instances = await this.instancesService.findAll(tenantId);
            resolvedA = instances.find(i => i.id === instA);
            resolvedB = instances.find(i => i.id === instB);
        }

        // If no specific instances provided or not found, find candidates (backward compat)
        if (!resolvedA || !resolvedB) {
            const instances = await this.instancesService.findAll(tenantId);
            const candidates = instances.filter(i =>
                (i.status === InstanceStatus.CONNECTED || i.status === 'connected' as any) &&
                i.warmupEnabled &&
                i.phone
            );

            if (candidates.length < 2) {
                this.logger.warn(`Not enough candidates for warmup session (Found ${candidates.length}, need 2)`);
                return { success: false, reason: 'min_instances', count: candidates.length, totalDurationMs: 0 };
            }

            const shuffled = candidates.sort(() => 0.5 - Math.random());
            [resolvedA, resolvedB] = shuffled.slice(0, 2);
        }

        instA = resolvedA;
        instB = resolvedB;

        if (!instA.phone || !instB.phone) {
            this.logger.warn(`Instances missing phone numbers: A=${instA.phone}, B=${instB.phone}`);
            return { success: false, reason: 'missing_phones', totalDurationMs: 0 };
        }

        console.log(`[Warmup] 💬 Generating conversation: ${instA.instanceName} (${instA.phone}) ↔ ${instB.instanceName} (${instB.phone})`);

        // Generate conversation with MORE messages
        const allTopics = ['trabalho', 'futebol', 'clima', 'comida', 'tecnologia', 'viagem', 'filmes',
            'música', 'série', 'receitas', 'exercício', 'pets', 'feriado', 'compras online',
            'trânsito', 'família', 'notícias', 'memes', 'jogos', 'café'];
        const randomTopics = allTopics.sort(() => 0.5 - Math.random()).slice(0, 3);

        const niche = instA.metaConfig?.warmupNiche || instB.metaConfig?.warmupNiche || null;

        let conversation;
        try {
            conversation = await this.aiService.generateWarmupConversation({
                messageCount: Math.floor(Math.random() * 8) + 8, // 8-15 messages (more than before)
                topics: randomTopics,
                niche: niche || undefined,
            });

            if (!conversation || !Array.isArray(conversation)) {
                this.logger.error(`AI generated invalid conversation: ${JSON.stringify(conversation)}`);
                return { success: false, reason: 'ai_error_invalid_response', totalDurationMs: 0 };
            }
        } catch (error) {
            this.logger.error(`Failed to generate warmup conversation: ${error.message}`);
            return { success: false, reason: 'ai_exception', error: error.message, totalDurationMs: 0 };
        }

        // Schedule messages
        let accumulatedDelay = startDelayMs;
        let messagesScheduled = 0;

        for (const msg of conversation) {
            try {
                if (!msg || typeof msg.content !== 'string') {
                    this.logger.warn(`Skipping invalid message object: ${JSON.stringify(msg)}`);
                    continue;
                }

                const sender = msg.role === 'A' ? instA : instB;
                const receiver = msg.role === 'A' ? instB : instA;

                // Fallback: instâncias antigas podem não ter 'provider' salvo
                const resolvedProvider = sender.provider || 'evolution';

                if (!sender.instanceName) {
                    this.logger.warn(`Skipping message: sender has no instanceName`);
                    continue;
                }

                // Use Human Behavior Service for realistic timing
                const timing = this.humanBehavior.generateTimingMetadata(msg.content);
                accumulatedDelay += timing.totalWaitMs;

                // Add extra buffer (random 10-45s) for more natural pacing
                accumulatedDelay += Math.floor(Math.random() * 35000) + 10000;

                await this.warmupQueue.add(
                    'execute-warmup-message',
                    {
                        instanceId: sender.id,
                        instanceName: sender.instanceName,
                        toPhone: receiver.phone,
                        content: msg.content,
                        tenantId: sender.tenantId,
                        provider: resolvedProvider,
                    },
                    {
                        delay: accumulatedDelay,
                        removeOnComplete: true,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 30000, // retry após 30s, 60s, 120s
                        },
                    }
                );
                messagesScheduled++;
            } catch (loopError) {
                this.logger.error(`Error in scheduling message: ${loopError.message}`);
            }
        }

        const minutes = Math.round(accumulatedDelay / 1000 / 60);
        console.log(`[Warmup] ✅ Scheduled ${messagesScheduled} messages for ${instA.instanceName}↔${instB.instanceName}. Duration: ~${minutes} min.`);
        return {
            success: true,
            messages: messagesScheduled,
            totalDurationMs: accumulatedDelay,
            conversation,
            instA: { id: instA.id, name: instA.instanceName, phone: instA.phone, provider: instA.provider },
            instB: { id: instB.id, name: instB.instanceName, phone: instB.phone, provider: instB.provider }
        };
    }

    // =========================================================================
    // LIVE SESSION — mensagens reais em tempo real com WebSocket
    // =========================================================================

    /**
     * Dispara uma conversa real entre dois chips com delay de segundos.
     * Emite eventos WebSocket 'warmup:live-message' em tempo real.
     */
    async createLiveSession(
        tenantId: string,
        instAId: string,
        instBId: string,
        sessionId: string,
    ): Promise<any> {
        const instances = await this.instancesService.findAll(tenantId);
        const instA = instances.find(i => i.id === instAId);
        const instB = instances.find(i => i.id === instBId);

        if (!instA || !instB) {
            return { success: false, reason: 'instances_not_found' };
        }
        
        // 🔥 VALIDAR CONEXÃO REAL
        if (instA.status !== 'connected' || instB.status !== 'connected') {
            const disconnected: string[] = [];
            if (instA.status !== 'connected') disconnected.push(instA.instanceName || instA.phone);
            if (instB.status !== 'connected') disconnected.push(instB.instanceName || instB.phone);
            
            this.logger.warn(`[LIVE] Tentativa de iniciar conversa com instâncias desconectadas: ${disconnected.join(', ')}`);
            return { 
                success: false, 
                reason: 'instance_disconnected',
                message: `As seguintes instâncias estão desconectadas: ${disconnected.join(', ')}. Por favor, conecte-as antes de iniciar.`
            };
        }

        if (!instA.phone || !instB.phone) {
            return { success: false, reason: 'missing_phones' };
        }

        this.logger.log(`🔴 [LIVE] Starting live session: ${instA.instanceName} ↔ ${instB.instanceName}`);

        // Generate conversation topics
        const allTopics = ['trabalho', 'futebol', 'clima', 'comida', 'tecnologia', 'viagem', 'filmes', 'música', 'série'];
        const topics = allTopics.sort(() => 0.5 - Math.random()).slice(0, 3);

        const niche = instA.metaConfig?.warmupNiche || instB.metaConfig?.warmupNiche || null;

        let conversation: any[];
        try {
            conversation = await this.aiService.generateWarmupConversation({
                messageCount: Math.floor(Math.random() * 6) + 6, // 6-11 msgs
                topics,
                niche: niche || undefined,
            });
        } catch (e) {
            this.logger.error(`[LIVE] AI error: ${e.message}`);
            return { success: false, reason: 'ai_error' };
        }

        // Emit session start
        this.eventsGateway.emitToTenant(tenantId, 'warmup:live-start', {
            sessionId,
            instA: { id: instA.id, name: instA.instanceName, phone: instA.phone },
            instB: { id: instB.id, name: instB.instanceName, phone: instB.phone },
            totalMessages: conversation.length,
        });

        // Fire messages asynchronously — don't block the HTTP response
        this.sendLiveMessagesAsync(tenantId, sessionId, instA, instB, conversation);

        return {
            success: true,
            messageCount: conversation.length,
            sessionId,
            instA: { id: instA.id, name: instA.instanceName, phone: instA.phone },
            instB: { id: instB.id, name: instB.instanceName, phone: instB.phone },
        };
    }

    /** Sends messages with human-like delays and emits WS events */
    private async sendLiveMessagesAsync(
        tenantId: string,
        sessionId: string,
        instA: Instance,
        instB: Instance,
        conversation: any[],
    ) {
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
        let index = 0;

        for (const msg of conversation) {
            const sender = msg.role === 'A' ? instA : instB;
            const receiver = msg.role === 'A' ? instB : instA;
            const provider = sender.provider || 'evolution';

            // Emit 'typing' indicator
            this.eventsGateway.emitToTenant(tenantId, 'warmup:live-typing', {
                sessionId,
                from: sender.instanceName,
                role: msg.role,
            });

            // Realistic typing delay (1.5s min, up to ~5s for longer messages)
            const typingMs = Math.max(1500, Math.min(msg.content.length * 40, 5000));
            
            let status: 'sent' | 'error' = 'sent';
            let currentMsgType = 'text';
            let currentMsgContent = msg.content;

            try {
                const client = this.whatsappFactory.getProvider(provider);
                
                if (msg.isAudio) {
                    // 🎙️ RITUAL DO ÁUDIO REAL:
                    this.logger.log(`[LIVE] Generating real voice audio for message index ${index}`);
                    currentMsgType = 'audio';
                    
                    // 1. Determina o perfil de voz e velocidade (busca no metaConfig ou fallback neutro)
                    const voice = sender.metaConfig?.voiceProfile || 'alloy';
                    const speed = Number(sender.metaConfig?.voiceSpeed) || 1.0;
                    const model = sender.metaConfig?.voiceModel || 'tts-1-hd';
                    this.logger.log(`[LIVE] Synthesizing voice using profile: ${voice}, speed: ${speed}, model: ${model}`);
                    
                    let buffer: Buffer;
                    // Se o ID for grande, assume-se ElevenLabs clonada
                    if (voice.length > 15 && await this.elevenLabs.hasKey(tenantId)) {
                        try {
                            this.logger.log(`[LIVE] Utilizando ElevenLabs para clonagem de voz`);
                            buffer = await this.elevenLabs.synthesizeSpeech(msg.content, voice, tenantId);
                        } catch (e) {
                            this.logger.warn(`ElevenLabs falhou, fallback para OpenAI: ${e.message}`);
                            buffer = await this.aiService.synthesizeSpeech(msg.content, 'alloy', speed, model);
                        }
                    } else {
                        buffer = await this.aiService.synthesizeSpeech(msg.content, voice as any, speed, model);
                    }
                    
                    // 2. Persiste em pasta pública para o provedor puxar
                    const uploadsDir = path.join(process.cwd(), 'uploads', 'temp_warmup');
                    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                    
                    const filename = `voice_${uuidv4()}.mp3`;
                    const filepath = path.join(uploadsDir, filename);
                    fs.writeFileSync(filepath, buffer);
                    
                    // 🔥 ESTRATÉGIA NUCLEAR CORRIGIDA: Enviar Base64 PURO!
                    // O teste final validou que a Evolution V2 espera a string Base64 SEM o prefixo dataUri!
                    const base64Audio = buffer.toString('base64');
                    
                    // 4. Indica que está "gravando áudio" (simulação de 3s)
                    await client.sendPresence(sender.instanceName, receiver.phone, 'recording', 3000);
                    
                    // 5. Envia como Mídia (Passando a string base64 pura diretamente)
                    await client.sendMedia(sender.instanceName, receiver.phone, {
                        type: 'audio',
                        url: base64Audio,
                        filename: 'audio.mp3'
                    });
                    
                    // Limpeza rápida de arquivo não é recomendada de imediato (provedor precisa ler), rodar depois de alguns mins se necessário.
                } else {
                    // 📝 ENVIO DE TEXTO TRADICIONAL
                    await client.sendPresence(sender.instanceName, receiver.phone, 'composing', typingMs);
                    await client.sendText(sender.instanceName, receiver.phone, msg.content);
                }

                // Increment dailySent counter
                await this.instanceRepo.increment({ id: sender.id }, 'dailySent', 1).catch(() => { });
            } catch (e) {
                this.logger.error(`[LIVE] Failed to send msg ${index}: ${e.message}`);
                status = 'error';
            }

            // Emit message event
            this.eventsGateway.emitToTenant(tenantId, 'warmup:live-message', {
                sessionId,
                index,
                role: msg.role,
                content: currentMsgContent,
                isAudio: msg.isAudio,
                from: sender.instanceName,
                fromPhone: sender.phone,
                to: receiver.instanceName,
                toPhone: receiver.phone,
                status,
                timestamp: new Date().toISOString(),
            });

            index++;

            // Gap between messages: 2-8 seconds (natural rhythm)
            if (index < conversation.length) {
                await delay(2000 + Math.random() * 6000);
            }
        }

        // Emit session complete
        this.eventsGateway.emitToTenant(tenantId, 'warmup:live-end', {
            sessionId,
            totalSent: index,
        });

        this.logger.log(`🔴 [LIVE] Session ${sessionId} complete — ${index} messages sent.`);
    }

    /**
     * Get metadata for a specific warmup day
     */
    getScheduleForDay(day: number) {
        return WARMUP_SCHEDULE.find(s => s.day === day);
    }

    /**
     * Get warmup statistics for a tenant
     */
    async getStats(tenantId: string) {
        const instances = await this.instancesService.findAll(tenantId);
        const warmupInstances = instances.filter(i => i.warmupEnabled);

        const total = warmupInstances.length;
        const totalMessagesSent = warmupInstances.reduce((acc, curr) => acc + curr.dailySent, 0);

        // Simple health calculation (mock for now, can be improved based on connection stability)
        const avgHealth = total > 0
            ? Math.round(warmupInstances.reduce((acc, curr) => acc + (curr.status === 'connected' ? 100 : 50), 0) / total)
            : 0;

        return {
            activeChips: total,
            totalMessagesSent,
            avgHealth,
            instances: warmupInstances.map(i => ({
                id: i.id,
                phone: i.phone,
                day: i.warmupDay,
                dailyLimit: i.dailyLimit,
                sent: i.dailySent,
                status: i.status,
                metaConfig: i.metaConfig,
                health: i.status === 'connected' ? 95 + Math.floor(Math.random() * 5) : 50
            }))
        };
    }

    /**
     * Calculate current progress percentage
     */
    getWarmupProgress(day: number): number {
        const totalDays = WARMUP_SCHEDULE.length;
        if (day >= totalDays) return 100;
        return Math.round((day / totalDays) * 100);
    }
}
