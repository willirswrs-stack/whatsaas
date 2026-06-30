"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGlobalApiSettings = exports.getGlobalApiSettings = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SETTINGS_PATH = path.resolve(process.cwd(), 'global_settings.json');
const getGlobalApiSettings = () => {
    let storedSettings = {};
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const fileContent = fs.readFileSync(SETTINGS_PATH, 'utf8');
            storedSettings = JSON.parse(fileContent);
        }
    }
    catch (e) {
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
exports.getGlobalApiSettings = getGlobalApiSettings;
const updateGlobalApiSettings = (newSettings) => {
    let current = (0, exports.getGlobalApiSettings)();
    const merged = { ...current, ...newSettings };
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf8');
        return merged;
    }
    catch (e) {
        console.error('Error writing global_settings.json:', e);
        throw new Error('Falha ao gravar configurações');
    }
};
exports.updateGlobalApiSettings = updateGlobalApiSettings;
