import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AsaasService {
    private readonly logger = new Logger(AsaasService.name);
    private readonly apiKey: string;
    private readonly baseUrl: string;

    constructor(private config: ConfigService) {
        this.apiKey = this.config.get<string>('ASAAS_API_KEY') || '';
        this.baseUrl = this.config.get<string>('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3';
    }

    private get headers() {
        return {
            'Content-Type': 'application/json',
            'access_token': this.apiKey
        };
    }

    async createCustomer(data: { name: string; email: string; cpfCnpj?: string; phone?: string }) {
        try {
            this.logger.log(`Criando cliente Asaas para: ${data.email}`);
            const response = await fetch(`${this.baseUrl}/customers`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.errors?.[0]?.description || 'Falha ao criar cliente no Asaas');
            }
            return result; // Contém 'id' do customer
        } catch (e) {
            this.logger.error(`Erro createCustomer: ${e.message}`);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    async createSubscription(data: { customerId: string; planValue: number; description: string; cycle?: string }) {
        try {
            this.logger.log(`Criando assinatura Asaas p/ Customer: ${data.customerId}`);
            const response = await fetch(`${this.baseUrl}/subscriptions`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    customer: data.customerId,
                    billingType: 'UNDEFINED', // Permite cliente escolher (Boleto, Cartão ou PIX)
                    value: data.planValue,
                    nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Amanhã
                    cycle: data.cycle || 'MONTHLY',
                    description: data.description
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.errors?.[0]?.description || 'Falha ao criar assinatura');
            }
            return result; // Contém 'id' da subscription e invoice URL
        } catch (e) {
            this.logger.error(`Erro createSubscription: ${e.message}`);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    async getSubscriptionPaymentInfo(subscriptionId: string) {
        try {
            // Buscar as cobranças da assinatura para pegar a URL de pagamento atual
            const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}/payments`, {
                headers: this.headers
            });
            const result = await response.json();
            if (!response.ok) throw new Error('Falha ao buscar pagamentos');
            return result.data?.[0]; // Último pagamento gerado
        } catch (e) {
            this.logger.error(`Erro getSubscriptionPaymentInfo: ${e.message}`);
            return null;
        }
    }

    async getSubscription(subscriptionId: string) {
        try {
            const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
                headers: this.headers
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.errors?.[0]?.description || 'Falha ao buscar assinatura');
            return result;
        } catch (e) {
            this.logger.error(`Erro getSubscription: ${e.message}`);
            return null;
        }
    }

    async updateSubscription(subscriptionId: string, data: { value: number; description: string; cycle?: string }) {
        try {
            this.logger.log(`Atualizando assinatura Asaas: ${subscriptionId}`);
            const payload: any = {
                value: data.value,
                description: data.description,
                updatePendingPayments: true // Update future charges
            };
            if (data.cycle) payload.cycle = data.cycle;
            
            const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
                method: 'POST', // Asaas API uses POST to subscriptions/{id} for updates
                headers: this.headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.errors?.[0]?.description || 'Falha ao atualizar assinatura');
            }
            return result;
        } catch (e) {
            this.logger.error(`Erro updateSubscription: ${e.message}`);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }
}
