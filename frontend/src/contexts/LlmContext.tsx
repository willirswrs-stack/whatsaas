'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/lib/auth';
import api from '@/lib/api';

export type LlmProvider = 'openai' | 'anthropic' | 'gemini' | 'groq';

export interface GlobalLlmConfig {
    provider: LlmProvider;
    model: string;
    temperature: number;
    maxTokens: number;
}

interface LlmContextType {
    llmConfig: GlobalLlmConfig;
    isLoading: boolean;
    providerLabel: string;
    modelLabel: string;
}

const DEFAULT_LLM: GlobalLlmConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
};

/** Labels legíveis para cada provider */
export const PROVIDER_LABELS: Record<LlmProvider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic (Claude)',
    gemini: 'Google Gemini',
    groq: 'Groq',
};

/** Modelos disponíveis por provider */
export const PROVIDER_MODELS: Record<LlmProvider, { value: string; label: string }[]> = {
    openai: [
        { value: 'gpt-4o', label: 'GPT-4o (Recomendado)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Econômico)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Rápido)' },
    ],
    anthropic: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recomendado)' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Rápido)' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Poderoso)' },
    ],
    gemini: [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Recomendado)' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Rápido)' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Novo)' },
    ],
    groq: [
        { value: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B (Recomendado)' },
        { value: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B (Ultra-rápido)' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    ],
};

const LlmContext = createContext<LlmContextType>({
    llmConfig: DEFAULT_LLM,
    isLoading: true,
    providerLabel: 'OpenAI',
    modelLabel: 'GPT-4o Mini',
});

export function LlmProvider({ children }: { children: ReactNode }) {
    const [llmConfig, setLlmConfig] = useState<GlobalLlmConfig>(DEFAULT_LLM);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadGlobalLlm = async () => {
            try {
                const res = await api.get('/settings/global/public');
                const data = res.data;
                if (data.globalLlmProvider) {
                    setLlmConfig({
                        provider: data.globalLlmProvider as LlmProvider,
                        model: data.globalLlmModel || DEFAULT_LLM.model,
                        temperature: data.globalLlmTemperature ?? DEFAULT_LLM.temperature,
                        maxTokens: data.globalLlmMaxTokens ?? DEFAULT_LLM.maxTokens,
                    });
                }
            } catch {
                // Silently use defaults
            } finally {
                setIsLoading(false);
            }
        };

        loadGlobalLlm();
    }, []);

    const providerLabel = PROVIDER_LABELS[llmConfig.provider] || llmConfig.provider;
    const modelLabel =
        PROVIDER_MODELS[llmConfig.provider]?.find((m) => m.value === llmConfig.model)?.label ||
        llmConfig.model;

    return (
        <LlmContext.Provider value={{ llmConfig, isLoading, providerLabel, modelLabel }}>
            {children}
        </LlmContext.Provider>
    );
}

export function useLlm() {
    return useContext(LlmContext);
}
