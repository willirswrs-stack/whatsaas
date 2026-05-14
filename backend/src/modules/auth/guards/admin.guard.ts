import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.role !== 'super_admin') {
            throw new ForbiddenException('Acesso restrito apenas para Super Administradores');
        }

        return true;
    }
}
