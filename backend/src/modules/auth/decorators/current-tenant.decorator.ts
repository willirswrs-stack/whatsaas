import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get the current tenant ID from the request
 * Usage: @CurrentTenant() tenantId: string
 */
export const CurrentTenant = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.tenantId || request.tenantId;
    },
);

/**
 * Decorator to get the current user from the request
 * Usage: @CurrentUser() user: UserPayload
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

/**
 * Interface for user payload in JWT
 */
export interface UserPayload {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
}
