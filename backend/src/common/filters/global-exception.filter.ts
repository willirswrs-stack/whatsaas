
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Obter Request ID (injetado pelo pino-http ou gerado agora)
        const requestId = (request.headers['x-request-id'] as string) ||
            (request as any).id ||
            'unknown-' + Date.now();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';
        let details = null;

        // Tratamento de tipos de erros conhecidos
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res: any = exception.getResponse();

            if (typeof res === 'object') {
                message = res.message || message;
                code = res.error || 'HTTP_ERROR';
                details = res.message; // NestJS class-validator retorna array
            } else {
                message = res;
            }

            // Padronizar códigos específicos
            if (status === HttpStatus.UNAUTHORIZED) code = 'UNAUTHORIZED';
            if (status === HttpStatus.FORBIDDEN) code = 'FORBIDDEN';
            if (status === HttpStatus.NOT_FOUND) code = 'NOT_FOUND';
            if (status === HttpStatus.BAD_REQUEST) code = 'VALIDATION_ERROR';

        } else if (exception instanceof QueryFailedError) {
            // Erros do TypeORM (Postgres)
            status = HttpStatus.BAD_REQUEST;
            code = 'DB_ERROR';
            message = 'Database operation failed';
            // Em dev, mostrar o driverError para debug
            if (process.env.NODE_ENV !== 'production') {
                details = (exception as any).driverError?.message || exception.message;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
            // Stack trace apenas em log
        }

        // Logar o erro com contexto completo
        const logContext = {
            requestId,
            method: request.method,
            url: request.url,
            body: request.body,
            query: request.query,
            statusCode: status,
            exception: exception instanceof Error ? exception.stack : exception,
        };

        if (status >= 500) {
            this.logger.error(`Critical Error [${requestId}]: ${message}`, logContext);
        } else {
            this.logger.warn(`Request Error [${requestId}]: ${message}`, logContext);
        }

        // Resposta padronizada para o cliente
        response.status(status).json({
            success: false,
            error: {
                code,
                message,
                details: Array.isArray(details) ? details : (details ? [details] : undefined),
            },
            meta: {
                requestId,
                timestamp: new Date().toISOString(),
                path: request.url,
            },
        });
    }
}
