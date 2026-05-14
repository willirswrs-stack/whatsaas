import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.tenantId) {
            throw new ForbiddenException('Invalid tenant context');
        }

        // Forçar verificação de status em tempo real para bloqueios financeiros
        const tenant = await this.tenantRepo.findOne({ 
            where: { id: user.tenantId },
            select: ['id', 'status'] // Otimizado para performance
        });

        if (!tenant) {
            throw new ForbiddenException('Conta empresarial não localizada.');
        }

        // Permitir acesso se o papel for Super Admin independente do status (Opcional mas bom para debug)
        if (user.role === 'super_admin') {
            request.tenantId = user.tenantId;
            return true;
        }

        if (tenant.status !== 'active' && tenant.status !== 'trial') {
            throw new ForbiddenException('Acesso Bloqueado: Assinatura suspensa ou aguardando pagamento.');
        }

        // Set tenant ID in request for use in services
        request.tenantId = user.tenantId;

        return true;
    }
}

// Role-based guard
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<string[]>(
            'roles',
            context.getHandler(),
        );

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return false;
        }

        return requiredRoles.includes(user.role);
    }
}
