
export enum InstanceStatus {
    CREATED = 'created',            // Criada no DB, mas não no Provider
    INITIALIZING = 'initializing',  // Criando no Provider
    QR_PENDING = 'qr_pending',      // Aguardando leitura do QR
    CONNECTING = 'connecting',      // Lendo QR/Conectando
    CONNECTED = 'connected',        // Pronta para envio
    DISCONNECTED = 'disconnected',  // Desconectada (logout ou queda)
    ERROR = 'error',                // Erro irrecuperável
    RECONNECTING = 'reconnecting',  // Tentativa automática
    BANNED = 'banned'               // Número banido pelo WhatsApp
}
