import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ElevenLabsService {
    private readonly logger = new Logger(ElevenLabsService.name);
    private readonly baseUrl = 'https://api.elevenlabs.io/v1';
    private readonly apiKey: string;

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get('ELEVENLABS_API_KEY', '');
    }

    /**
     * Creates an Instant Voice Clone by uploading samples
     */
    async cloneVoice(name: string, audioBuffer: Buffer, filename: string): Promise<string> {
        if (!this.apiKey || this.apiKey.length < 5) {
            throw new Error('ELEVENLABS_API_KEY não configurada no .env do backend.');
        }

        try {
            this.logger.log(`[ElevenLabs] Inciando clonagem de voz: ${name}`);
            
            const form = new FormData();
            form.append('name', name);
            // Native FormData supports converting buffer to Blob or direct use if supported. 
            // Best practice for reliability: create a new Blob from the buffer for proper header negotiation.
            const blob = new Blob([new Uint8Array(audioBuffer)]);
            form.append('files', blob, filename);
            form.append('description', 'Cloned automatically via WhatSaas Warmup Engine');

            const response = await axios.post(`${this.baseUrl}/voices/add`, form, {
                headers: {
                    'xi-api-key': this.apiKey,
                    // Let Axios/FormData set headers automatically (multipart)
                }
            });

            const voiceId = response.data?.voice_id;
            this.logger.log(`[ElevenLabs] ✅ Voz clonada com sucesso! ID: ${voiceId}`);
            return voiceId;
        } catch (error: any) {
            this.logger.error(`[ElevenLabs] Erro na clonagem: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
            throw new Error(`Erro ElevenLabs: ${error.response?.data?.detail?.message || error.message}`);
        }
    }

    /**
     * Synthesize speech using ElevenLabs
     */
    async synthesizeSpeech(text: string, voiceId: string, stability = 0.5, similarityBoost = 0.75): Promise<Buffer> {
        if (!this.apiKey) throw new Error('ELEVENLABS_API_KEY missing');

        try {
            this.logger.log(`[ElevenLabs] Gerando áudio para voz ${voiceId}`);
            
            const response = await axios.post(
                `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
                {
                    text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability,
                        similarity_boost: similarityBoost
                    }
                },
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer'
                }
            );

            return Buffer.from(response.data);
        } catch (error: any) {
            this.logger.error(`[ElevenLabs] Falha na síntese: ${error.message}`);
            throw error;
        }
    }

    hasKey(): boolean {
        return !!this.apiKey && this.apiKey.length > 5;
    }
}
