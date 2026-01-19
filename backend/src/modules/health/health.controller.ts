
import { Controller, Get } from '@nestjs/common';
import {
    HealthCheckService,
    HttpHealthIndicator,
    TypeOrmHealthIndicator,
    HealthCheck,
    MemoryHealthIndicator
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private db: TypeOrmHealthIndicator,
        private memory: MemoryHealthIndicator,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            // Verifica banco de dados (timeout 5s)
            () => this.db.pingCheck('database', { timeout: 5000 }),

            // Verifica uso de memória (heap < 1.5GB)
            () => this.memory.checkHeap('memory_heap', 1500 * 1024 * 1024),

            // Opcional: Verificar Evolution API se URL estiver configurada
            /*
            () => 
              process.env.EVOLUTION_API_URL 
                ? this.http.pingCheck('evolution_api', process.env.EVOLUTION_API_URL)
                : Promise.resolve({ evolution_api: { status: 'up', message: 'skipped' } }),
            */
        ]);
    }
}
