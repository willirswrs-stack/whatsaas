import { Controller, Post, Body, Logger, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { Tenant, SubscriptionPlan } from '../tenants/entities/tenant.entity';
import { AsaasService } from './asaas.service';
import { ProxiesService } from '../proxies/proxies.service';

@Controller('billing')
export class BillingController {
    private readonly logger = new Logger(BillingController.name);

    constructor(
        private asaasService: AsaasService,
        private proxiesService: ProxiesService,
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
        @InjectRepository(SubscriptionPlan)
        private planRepo: Repository<SubscriptionPlan>,
    ) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('subscribe')
    async createSubscription(@Request() req, @Body() body: { planId: string, cpfCnpj: string, phone?: string }) {
        const user = req.user;
        const tenantId = user.tenantId;

        this.logger.log(`Iniciando checkout para tenant ${tenantId} - Plano ${body.planId}`);

        const tenant = await this.tenantRepo.findOne({ where: { id: tenantId }, relations: ['plan'] });
        if (!tenant) throw new Error('Empresa não encontrada');

        const plan = await this.planRepo.findOne({ where: { id: body.planId } });
        if (!plan) throw new Error('Plano de assinatura inválido');

        // 1. Criar/Garantir Cliente Asaas
        let asaasCustId = tenant.asaasCustomerId;
        if (!asaasCustId) {
            const res = await this.asaasService.createCustomer({
                name: tenant.name || 'Empresa Sem Nome',
                email: tenant.email || user.email,
                cpfCnpj: body.cpfCnpj,
                phone: body.phone
            });
            asaasCustId = res.id;
            tenant.asaasCustomerId = asaasCustId;
            await this.tenantRepo.save(tenant);
        }

        // 2. Criar Assinatura Asaas
        const subRes = await this.asaasService.createSubscription({
            customerId: asaasCustId,
            planValue: Number(plan.price),
            description: `Assinatura WhatSaas - Plano ${plan.name}`
        });

        // 3. Salvar ID da assinatura e plano atual como pendente/trial ou manter como está até pagar
        tenant.asaasSubscriptionId = subRes.id;
        tenant.planId = plan.id;
        // O status mudará para active APENAS quando o webhook confirmar o primeiro pagamento!
        await this.tenantRepo.save(tenant);

        return {
            message: 'Assinatura gerada com sucesso',
            invoiceUrl: subRes.invoiceUrl, // Link p/ cliente pagar
            bankSlipUrl: subRes.bankSlipUrl,
            invoiceNumber: subRes.invoiceNumber
        };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('checkout-proxy')
    async checkoutProxy(@Request() req) {
        const tenantId = req.user.tenantId;
        const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
        if (!tenant) throw new Error('Empresa não encontrada');

        // Garante cliente no Asaas
        let asaasCustId = tenant.asaasCustomerId;
        if (!asaasCustId) {
            const res = await this.asaasService.createCustomer({
                name: tenant.name || 'Empresa Sem Nome',
                email: tenant.email || req.user.email,
                cpfCnpj: '00000000000' // Placeholder for proxy if not set
            });
            asaasCustId = res.id;
            tenant.asaasCustomerId = asaasCustId;
            await this.tenantRepo.save(tenant);
        }

        // Criar cobrança avulsa no Asaas para o Proxy
        // A API de cobranças avulsas (payments) é diferente de subscriptions.
        // O AsaasService precisaria de um método createPayment. Usaremos um mock genérico por agora.
        this.logger.log(`Gerando cobrança avulsa de Proxy (R$ 49,90) para o tenant ${tenantId}`);

        // TODO: MOCK DA COBRANÇA. Na real, deve chamar asaasService.createPayment({ value: 49.90, description: "PROXY_ADDON_..." })
        // Aqui simularemos o ID do payment para que possamos testar no painel.
        
        return {
            message: 'Cobrança avulsa de Proxy gerada',
            invoiceUrl: 'https://sandbox.asaas.com/i/mocked_proxy_link',
            paymentId: `pay_proxy_${tenantId}_${Date.now()}` // Este ID identificaria a compra.
        };
    }

    // WEBHOOK PÚBLICO: ASAAS chama aqui para confirmar pagamentos!
    @HttpCode(HttpStatus.OK)
    @Post('webhook')
    async handleAsaasWebhook(@Body() payload: any) {
        this.logger.log(`[Webhook Asaas] Recebido evento: ${payload.event}`);
        
        const eventType = payload.event;
        const payment = payload.payment;

        // Se for confirmação de pagamento recebido (ou vencido)
        if (eventType === 'PAYMENT_RECEIVED' || eventType === 'PAYMENT_CONFIRMED') {
            const subscriptionId = payment.subscription; // ID da assinatura se for recorrente
            const customerId = payment.customer;

            this.logger.log(`💰 Pagamento confirmado para cliente ${customerId}! Ativando acesso...`);

            // Localizar o tenant associado por customerId ou subscriptionId
            const tenant = await this.tenantRepo.findOne({
                where: [
                    { asaasSubscriptionId: subscriptionId },
                    { asaasCustomerId: customerId }
                ],
                relations: ['plan']
            });

            if (tenant) {
                // Checa se é um pagamento de Proxy Avulso (via descrição ou metadata do payment)
                // Como mock, verificaremos se a descrição contém "PROXY" ou se o ID começa com pay_proxy
                const isProxyPayment = payment.description?.includes('Proxy') || false;

                if (isProxyPayment) {
                    this.logger.log(`Pagamento avulso de Proxy recebido. Liberando Proxy Residencial ISP para tenant ${tenant.name}...`);
                    await this.proxiesService.buyProxyFromProvider(tenant.id);
                } else {
                    // É o pagamento da assinatura principal
                    tenant.status = 'active';
                    await this.tenantRepo.save(tenant);
                    this.logger.log(`✅ Tenant ${tenant.name} foi ATIVADO com sucesso via Webhook!`);
                    
                    // LÓGICA PLANO PREMIUM: Se for plano Premium (ex: nome do plano contém Premium), dar 1 Proxy Grátis no primeiro pagamento.
                    // Para simplificar, checamos o nome do plano.
                    if (tenant.plan && tenant.plan.name.toLowerCase().includes('premium')) {
                        // Verifica se ele já tem proxies para não dar múltiplos em cada renovação
                        const existingProxies = await this.proxiesService.getProxies(tenant.id);
                        if (existingProxies.length === 0) {
                            this.logger.log(`🎁 Cliente Premium Ativado: Liberando 1 Proxy Grátis para ${tenant.name}`);
                            await this.proxiesService.buyProxyFromProvider(tenant.id);
                        }
                    }
                }
            }
        }

        // Se o pagamento atrasar/vencer
        if (eventType === 'PAYMENT_OVERDUE') {
             const customerId = payment.customer;
             const tenant = await this.tenantRepo.findOne({ where: { asaasCustomerId: customerId } });
             if (tenant) {
                 // Opcional: Suspender ou colocar em aviso
                 tenant.status = 'suspended';
                 await this.tenantRepo.save(tenant);
                 this.logger.warn(`⛔ Tenant ${tenant.name} SUSPENSO por falta de pagamento.`);
             }
        }

        return { received: true };
    }
}
