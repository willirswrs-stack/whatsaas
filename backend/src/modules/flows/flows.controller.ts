import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FlowsService } from './flows.service';
import { CreateFlowDto, UpdateFlowDto, CreateTriggerDto, ExecuteFlowDto } from './dto';

@Controller('flows')
@UseGuards(JwtAuthGuard)
export class FlowsController {
    constructor(private readonly flowsService: FlowsService) { }

    // ============ FLOWS ============

    @Get()
    async findAll(@Request() req) {
        return this.flowsService.findAll(req.user.tenantId);
    }

    @Get('stats')
    async getStats(@Request() req) {
        return this.flowsService.getStats(req.user.tenantId);
    }

    @Get(':id')
    async findOne(@Request() req, @Param('id') id: string) {
        return this.flowsService.findById(req.user.tenantId, id);
    }

    @Post()
    async create(@Request() req, @Body() dto: CreateFlowDto) {
        return this.flowsService.create(req.user.tenantId, dto);
    }

    @Put(':id')
    async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateFlowDto) {
        return this.flowsService.update(req.user.tenantId, id, dto);
    }

    @Delete(':id')
    async delete(@Request() req, @Param('id') id: string) {
        return this.flowsService.delete(req.user.tenantId, id);
    }

    @Post(':id/duplicate')
    async duplicate(@Request() req, @Param('id') id: string) {
        return this.flowsService.duplicate(req.user.tenantId, id);
    }

    @Post(':id/activate')
    async activate(@Request() req, @Param('id') id: string) {
        return this.flowsService.activate(req.user.tenantId, id);
    }

    @Post(':id/pause')
    async pause(@Request() req, @Param('id') id: string) {
        return this.flowsService.pause(req.user.tenantId, id);
    }

    // ============ TRIGGERS ============

    @Get(':id/triggers')
    async getTriggers(@Request() req, @Param('id') id: string) {
        return this.flowsService.getTriggersByFlow(id);
    }

    @Post(':id/triggers')
    async createTrigger(@Request() req, @Param('id') id: string, @Body() dto: Omit<CreateTriggerDto, 'flowId'>) {
        return this.flowsService.createTrigger(req.user.tenantId, { ...dto, flowId: id });
    }

    @Put('triggers/:triggerId')
    async updateTrigger(@Request() req, @Param('triggerId') triggerId: string, @Body() dto: Partial<CreateTriggerDto>) {
        return this.flowsService.updateTrigger(req.user.tenantId, triggerId, dto);
    }

    @Delete('triggers/:triggerId')
    async deleteTrigger(@Request() req, @Param('triggerId') triggerId: string) {
        return this.flowsService.deleteTrigger(req.user.tenantId, triggerId);
    }

    // ============ EXECUTIONS ============

    @Get('executions/list')
    async getExecutions(@Request() req, @Query('flowId') flowId?: string) {
        return this.flowsService.getExecutions(req.user.tenantId, flowId);
    }

    @Get('executions/:id')
    async getExecution(@Param('id') id: string) {
        return this.flowsService.getExecutionById(id);
    }

    @Post('execute')
    async execute(@Request() req, @Body() dto: ExecuteFlowDto) {
        return this.flowsService.startExecution(req.user.tenantId, dto);
    }

    @Post('test')
    async testFlow(@Request() req, @Body() dto: any) {
        // Find or create contact
        // We handle this in service for better logic
        return this.flowsService.testFlow(req.user.tenantId, dto.flowId, dto.phone, dto.instanceId);
    }
}
