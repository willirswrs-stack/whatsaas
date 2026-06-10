import * as fs from 'fs';
import * as path from 'path';

export interface GlobalApiSettings {
    openaiKey: string;
    elevenlabsKey: string;
    evolutionUrl: string;
    evolutionKey: string;
    webhookUrl: string;
}

const SETTINGS_PATH = path.resolve(process.cwd(), 'global_settings.json');

export const getGlobalApiSettings = (): GlobalApiSettings => {
    let storedSettings: Partial<GlobalApiSettings> = {};
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const fileContent = fs.readFileSync(SETTINGS_PATH, 'utf8');
            storedSettings = JSON.parse(fileContent);
        }
    } catch (e) {
        console.error('Error reading global_settings.json:', e);
    }

    return {
        openaiKey: storedSettings.openaiKey || process.env.OPENAI_API_KEY || '',
        elevenlabsKey: storedSettings.elevenlabsKey || process.env.ELEVENLABS_API_KEY || '',
        evolutionUrl: storedSettings.evolutionUrl || process.env.EVOLUTION_API_URL || '',
        evolutionKey: storedSettings.evolutionKey || process.env.EVOLUTION_API_KEY || '',
        webhookUrl: storedSettings.webhookUrl || process.env.WEBHOOK_URL || '',
    };
};

export const updateGlobalApiSettings = (newSettings: Partial<GlobalApiSettings>) => {
    let current = getGlobalApiSettings();
    const merged = { ...current, ...newSettings };
    
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf8');
        return merged;
    } catch (e) {
        console.error('Error writing global_settings.json:', e);
        throw new Error('Falha ao gravar configurações');
    }
};
