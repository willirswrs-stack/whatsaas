
import { Controller, Get } from '@nestjs/common';
import { ReconnectionService } from './reconnection.service';

@Controller('reconnection')
export class ReconnectionController {
    constructor(private reconnectionService: ReconnectionService) { }

    @Get('status')
    async getReconnectionStatus() {
        return this.reconnectionService.getMonitoredInstances();
    }
}
