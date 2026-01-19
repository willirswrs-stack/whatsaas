import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
    protected async getTracker(req: Record<string, any>): Promise<string> {
        // Usa o tenantId se autenticado, caso contrário usa o IP
        return req.user?.tenantId ?? req.ip;
    }

    // Personaliza a mensagem de erro
    protected errorMessage = 'Você excedeu o limite de requisições permitidas para seu plano. Aguarde um momento.';
}
