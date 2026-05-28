import { Controller, Post, Body, Logger, HttpCode, HttpStatus, UseGuards, Request, BadRequestException } from '@nestjs/common';
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
        throw new BadRequestException(
            'Os proxies residenciais ISP estáticos agora são provisionados automaticamente e de forma gratuita para todas as suas instâncias, já inclusos no seu plano! Não é necessária a contratação avulsa.'
        );
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
                // É o pagamento da assinatura principal
                tenant.status = 'active';
                await this.tenantRepo.save(tenant);
                this.logger.log(`✅ Tenant ${tenant.name} foi ATIVADO com sucesso via Webhook!`);
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
